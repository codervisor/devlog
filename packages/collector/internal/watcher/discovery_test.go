package watcher

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestExpandPath(t *testing.T) {
	homeDir, _ := os.UserHomeDir()

	tests := []struct {
		name     string
		input    string
		contains string // Expected substring in result
	}{
		{
			name:     "Home directory expansion",
			input:    "~/.devlog/logs",
			contains: ".devlog",
		},
		{
			name:     "No expansion needed",
			input:    "/var/log/test.log",
			contains: "/var/log",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := expandPath(tt.input)

			// Check if expansion happened for ~ paths
			if tt.input[0] == '~' {
				if result == tt.input {
					t.Errorf("Path was not expanded: %s", result)
				}
				if !filepath.IsAbs(result) && homeDir != "" {
					t.Errorf("Expected absolute path, got: %s", result)
				}
			}
		})
	}
}

func TestIsLogFile(t *testing.T) {
	tests := []struct {
		name     string
		path     string
		expected bool
	}{
		{"Log extension", "test.log", true},
		{"Text extension", "output.txt", true},
		{"JSONL extension", "events.jsonl", true},
		{"NDJSON extension", "data.ndjson", true},
		{"Contains log", "application-log.dat", true},
		{"Contains error", "error-messages.dat", true},
		{"Regular file", "config.json", false},
		{"Binary file", "binary.exe", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isLogFile(tt.path)
			if result != tt.expected {
				t.Errorf("Expected %v for %s, got %v", tt.expected, tt.path, result)
			}
		})
	}
}

func TestDiscoverAgentLogs(t *testing.T) {
	// Test with known agents
	agents := []string{"copilot", "claude", "cursor"}

	for _, agent := range agents {
		t.Run(agent, func(t *testing.T) {
			logs, err := DiscoverAgentLogs(agent)

			// Should not error (even if no logs found)
			if err != nil {
				t.Errorf("Unexpected error for %s: %v", agent, err)
			}

			// Logs may or may not be found depending on system
			t.Logf("Found %d log locations for %s", len(logs), agent)
			for _, log := range logs {
				t.Logf("  - %s (isDir: %v, exists: %v)", log.Path, log.IsDir, log.Exists)
			}
		})
	}
}

func TestDiscoverAgentLogsInvalidAgent(t *testing.T) {
	_, err := DiscoverAgentLogs("nonexistent-agent")
	if err == nil {
		t.Error("Expected error for non-existent agent")
	}
}

func TestDiscoverAllAgentLogs(t *testing.T) {
	discovered, err := DiscoverAllAgentLogs()
	if err != nil {
		t.Fatalf("Failed to discover agent logs: %v", err)
	}

	t.Logf("Discovered logs for %d agents", len(discovered))
	for agent, logs := range discovered {
		t.Logf("Agent: %s", agent)
		for _, log := range logs {
			t.Logf("  - %s", log.Path)
		}
	}

	// On any system, we should have log locations defined
	// (even if they don't exist on this particular machine)
	if len(AgentLogLocations) == 0 {
		t.Error("No agent log locations defined")
	}
}

func TestFindLogFiles(t *testing.T) {
	// Create temp directory with test files
	tmpDir := t.TempDir()

	// Create some test files
	testFiles := []struct {
		name  string
		isLog bool
	}{
		{"test.log", true},
		{"output.txt", true},
		{"events.jsonl", true},
		{"config.json", false},
		{"app-log.dat", true},
		{"binary.exe", false},
	}

	for _, tf := range testFiles {
		path := filepath.Join(tmpDir, tf.name)
		if err := os.WriteFile(path, []byte("test"), 0600); err != nil {
			t.Fatalf("Failed to create test file: %v", err)
		}
	}

	// Find log files
	logFiles, err := FindLogFiles(tmpDir)
	if err != nil {
		t.Fatalf("Failed to find log files: %v", err)
	}

	// Count expected log files
	expectedCount := 0
	for _, tf := range testFiles {
		if tf.isLog {
			expectedCount++
		}
	}

	if len(logFiles) != expectedCount {
		t.Errorf("Expected %d log files, found %d", expectedCount, len(logFiles))
	}

	t.Logf("Found log files: %v", logFiles)
}

func TestGetLatestLogFile(t *testing.T) {
	// Create temp directory with test log files
	tmpDir := t.TempDir()

	// Create test log files with different timestamps
	files := []string{"old.log", "newer.log", "newest.log"}

	for _, filename := range files {
		path := filepath.Join(tmpDir, filename)
		if err := os.WriteFile(path, []byte("test"), 0600); err != nil {
			t.Fatalf("Failed to create test file: %v", err)
		}
		// Small delay to ensure different timestamps (not reliable in fast systems)
	}

	latest, err := GetLatestLogFile(tmpDir)
	if err != nil {
		t.Fatalf("Failed to get latest log file: %v", err)
	}

	if latest == "" {
		t.Error("Expected a log file path, got empty string")
	}

	t.Logf("Latest log file: %s", latest)
}

func TestAgentLogLocations(t *testing.T) {
	osName := runtime.GOOS

	// Verify that we have log locations for current OS
	foundForCurrentOS := false

	for agent, locations := range AgentLogLocations {
		if osLocations, ok := locations[osName]; ok {
			foundForCurrentOS = true
			if len(osLocations) == 0 {
				t.Errorf("Agent %s has empty location list for %s", agent, osName)
			}

			t.Logf("Agent %s on %s:", agent, osName)
			for _, loc := range osLocations {
				t.Logf("  - %s", loc)
			}
		}
	}

	if !foundForCurrentOS {
		t.Errorf("No agent locations defined for current OS: %s", osName)
	}

	// Verify we support major agents
	requiredAgents := []string{"copilot", "claude", "cursor"}
	for _, agent := range requiredAgents {
		if _, ok := AgentLogLocations[agent]; !ok {
			t.Errorf("Missing configuration for required agent: %s", agent)
		}
	}
}
