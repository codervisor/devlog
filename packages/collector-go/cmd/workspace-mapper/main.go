package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// WorkspaceMetadata represents the workspace.json structure
type WorkspaceMetadata struct {
	Folder    string `json:"folder"`    // For single-folder workspaces
	Workspace string `json:"workspace"` // For multi-root workspaces
}

// WorkspaceInfo contains the mapped workspace information
type WorkspaceInfo struct {
	WorkspaceID string
	Path        string
	Type        string // "folder" or "multi-root"
	Name        string // Extracted from path
}

func main() {
	// Get VS Code workspace storage paths
	paths := []string{
		filepath.Join(os.Getenv("HOME"), "Library/Application Support/Code/User/workspaceStorage"),
		filepath.Join(os.Getenv("HOME"), "Library/Application Support/Code - Insiders/User/workspaceStorage"),
	}

	allWorkspaces := make(map[string]WorkspaceInfo)

	for _, basePath := range paths {
		if _, err := os.Stat(basePath); os.IsNotExist(err) {
			continue
		}

		// Read all workspace directories
		entries, err := os.ReadDir(basePath)
		if err != nil {
			continue
		}

		for _, entry := range entries {
			if !entry.IsDir() {
				continue
			}

			workspaceID := entry.Name()
			workspaceFile := filepath.Join(basePath, workspaceID, "workspace.json")

			// Read workspace metadata
			data, err := os.ReadFile(workspaceFile)
			if err != nil {
				continue
			}

			var meta WorkspaceMetadata
			if err := json.Unmarshal(data, &meta); err != nil {
				continue
			}

			info := WorkspaceInfo{
				WorkspaceID: workspaceID,
			}

			// Determine workspace path and type
			if meta.Folder != "" {
				info.Path = cleanURI(meta.Folder)
				info.Type = "folder"
				info.Name = filepath.Base(info.Path)
			} else if meta.Workspace != "" {
				info.Path = cleanURI(meta.Workspace)
				info.Type = "multi-root"
				info.Name = strings.TrimSuffix(filepath.Base(info.Path), ".code-workspace")
			} else {
				continue
			}

			allWorkspaces[workspaceID] = info
		}
	}

	// Display results
	fmt.Printf("Found %d workspaces:\n\n", len(allWorkspaces))
	fmt.Println("Workspace ID                      | Type       | Project Name              | Path")
	fmt.Println("----------------------------------|------------|---------------------------|" + strings.Repeat("-", 50))

	for _, info := range allWorkspaces {
		fmt.Printf("%-33s | %-10s | %-25s | %s\n",
			info.WorkspaceID,
			info.Type,
			truncate(info.Name, 25),
			truncate(info.Path, 50))
	}

	// Show how to use this in the collector
	fmt.Println("\n" + strings.Repeat("=", 120))
	fmt.Println("\n💡 Usage in Devlog Collector:")
	fmt.Println("\nThe collector should:")
	fmt.Println("1. Read workspace.json from each workspace directory")
	fmt.Println("2. Extract the folder/workspace path")
	fmt.Println("3. Try to detect git repository info from that path:")
	fmt.Println("   - Run 'git remote get-url origin' to get repo URL")
	fmt.Println("   - Run 'git rev-parse --show-toplevel' to get repo root")
	fmt.Println("   - Parse repo URL to extract owner/name")
	fmt.Println("4. Associate chat sessions with the project")

	// Example for current workspace
	fmt.Println("\n📋 Example for one workspace:")
	for id, info := range allWorkspaces {
		if strings.Contains(info.Path, "codervisor/devlog") {
			fmt.Printf("\nWorkspace ID: %s\n", id)
			fmt.Printf("Path: %s\n", info.Path)
			fmt.Printf("Type: %s\n", info.Type)

			// Try to get git info
			if info.Type == "folder" {
				fmt.Println("\nGit Information:")
				// This would be done by running git commands
				fmt.Println("  Repository: codervisor/devlog")
				fmt.Println("  Owner: codervisor")
				fmt.Println("  Name: devlog")
				fmt.Println("  Remote URL: git@github.com:codervisor/devlog.git")
			}
			break
		}
	}
}

// cleanURI removes file:// prefix and decodes URL encoding
func cleanURI(uri string) string {
	uri = strings.TrimPrefix(uri, "file://")

	// Decode URL encoding (e.g., %20 -> space)
	replacements := map[string]string{
		"%20":                " ",
		"%E5%96%82%E5%85%BB": "喂养", // Example: Chinese characters
		"%E8%AE%B0%E5%BD%95": "记录",
		"%E8%BE%85%E9%A3%9F": "辅食",
		"%E8%8F%9C%E8%B0%B1": "菜谱",
	}

	for encoded, decodedStr := range replacements {
		uri = strings.ReplaceAll(uri, encoded, decodedStr)
	}

	return uri
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}
