package watcher

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

// AgentLogLocations defines default log paths per OS and agent
var AgentLogLocations = map[string]map[string][]string{
	"copilot": {
		"darwin": {
			"~/Library/Application Support/Code/User/workspaceStorage/*/chatSessions",
			"~/Library/Application Support/Code - Insiders/User/workspaceStorage/*/chatSessions",
		},
		"linux": {
			"~/.config/Code/User/workspaceStorage/*/chatSessions",
			"~/.config/Code - Insiders/User/workspaceStorage/*/chatSessions",
		},
		"windows": {
			"%APPDATA%\\Code\\User\\workspaceStorage\\*\\chatSessions",
			"%APPDATA%\\Code - Insiders\\User\\workspaceStorage\\*\\chatSessions",
		},
	},
	"claude": {
		"darwin": {
			"~/.claude/logs",
			"~/Library/Application Support/Claude/logs",
			"~/Library/Logs/Claude",
		},
		"linux": {
			"~/.claude/logs",
			"~/.config/claude/logs",
			"~/.local/share/claude/logs",
		},
		"windows": {
			"%APPDATA%\\Claude\\logs",
			"%LOCALAPPDATA%\\Claude\\logs",
		},
	},
	"cursor": {
		"darwin": {
			"~/Library/Application Support/Cursor/logs",
			"~/Library/Logs/Cursor",
		},
		"linux": {
			"~/.config/Cursor/logs",
			"~/.local/share/Cursor/logs",
		},
		"windows": {
			"%APPDATA%\\Cursor\\logs",
			"%LOCALAPPDATA%\\Cursor\\logs",
		},
	},
	"cline": {
		"darwin": {
			"~/.vscode/extensions/saoudrizwan.claude-dev-*/logs",
			"~/Library/Application Support/Code/logs/*/exthost",
		},
		"linux": {
			"~/.vscode/extensions/saoudrizwan.claude-dev-*/logs",
			"~/.config/Code/logs/*/exthost",
		},
		"windows": {
			"%USERPROFILE%\\.vscode\\extensions\\saoudrizwan.claude-dev-*\\logs",
			"%APPDATA%\\Code\\logs\\*\\exthost",
		},
	},
	"aider": {
		"darwin": {
			"~/.aider/logs",
			"~/.aider/.aider.history",
		},
		"linux": {
			"~/.aider/logs",
			"~/.aider/.aider.history",
		},
		"windows": {
			"%USERPROFILE%\\.aider\\logs",
			"%USERPROFILE%\\.aider\\.aider.history",
		},
	},
}

// DiscoveredLog represents a discovered log file or directory
type DiscoveredLog struct {
	AgentName string
	Path      string
	IsDir     bool
	Exists    bool
}

// DiscoverAgentLogs finds actual log file locations for a specific agent
func DiscoverAgentLogs(agentName string) ([]DiscoveredLog, error) {
	osName := runtime.GOOS
	patterns, exists := AgentLogLocations[agentName]
	if !exists {
		return nil, fmt.Errorf("unknown agent: %s", agentName)
	}

	osPlatterns, exists := patterns[osName]
	if !exists {
		return nil, fmt.Errorf("agent %s not supported on %s", agentName, osName)
	}

	var discovered []DiscoveredLog

	for _, pattern := range osPlatterns {
		// Expand path variables
		expanded := expandPath(pattern)

		// Handle glob patterns
		matches, err := filepath.Glob(expanded)
		if err != nil {
			// Log error but continue with other patterns
			continue
		}

		// Check each match
		for _, match := range matches {
			info, err := os.Stat(match)
			if err != nil {
				continue
			}

			discovered = append(discovered, DiscoveredLog{
				AgentName: agentName,
				Path:      match,
				IsDir:     info.IsDir(),
				Exists:    true,
			})
		}
	}

	return discovered, nil
}

// DiscoverAllAgentLogs discovers logs for all known agents
func DiscoverAllAgentLogs() (map[string][]DiscoveredLog, error) {
	result := make(map[string][]DiscoveredLog)

	for agentName := range AgentLogLocations {
		logs, err := DiscoverAgentLogs(agentName)
		if err != nil {
			continue // Skip agents that aren't supported on this OS
		}

		if len(logs) > 0 {
			result[agentName] = logs
		}
	}

	return result, nil
}

// FindLogFiles recursively finds log files in a directory
func FindLogFiles(dirPath string) ([]string, error) {
	var logFiles []string

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Continue on errors
		}

		if info.IsDir() {
			return nil
		}

		// Check if file is a log file
		if isLogFile(path) {
			logFiles = append(logFiles, path)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return logFiles, nil
}

// isLogFile checks if a file is likely a log file
func isLogFile(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	base := strings.ToLower(filepath.Base(path))

	// Check common log file extensions
	logExtensions := []string{".log", ".txt", ".json", ".jsonl", ".ndjson"}
	for _, logExt := range logExtensions {
		if ext == logExt {
			return true
		}
	}

	// Check common log file patterns
	logPatterns := []string{
		"log",
		"output",
		"console",
		"trace",
		"debug",
		"error",
		"access",
	}
	for _, pattern := range logPatterns {
		if strings.Contains(base, pattern) {
			return true
		}
	}

	return false
}

// expandPath expands ~ and environment variables in a path
func expandPath(path string) string {
	// Expand ~
	if strings.HasPrefix(path, "~/") {
		homeDir, err := os.UserHomeDir()
		if err == nil {
			path = filepath.Join(homeDir, path[2:])
		}
	}

	// Expand environment variables
	if runtime.GOOS == "windows" {
		// Windows uses %VAR% syntax
		path = os.ExpandEnv(path)
	} else {
		// Unix uses $VAR or ${VAR} syntax
		path = os.ExpandEnv(path)
	}

	return path
}

// GetLatestLogFile finds the most recently modified log file in a directory
func GetLatestLogFile(dirPath string) (string, error) {
	files, err := FindLogFiles(dirPath)
	if err != nil {
		return "", err
	}

	if len(files) == 0 {
		return "", fmt.Errorf("no log files found in %s", dirPath)
	}

	// Find the most recent file
	var latestFile string
	var latestTime int64

	for _, file := range files {
		info, err := os.Stat(file)
		if err != nil {
			continue
		}

		modTime := info.ModTime().Unix()
		if modTime > latestTime {
			latestTime = modTime
			latestFile = file
		}
	}

	if latestFile == "" {
		return "", fmt.Errorf("no accessible log files found")
	}

	return latestFile, nil
}
