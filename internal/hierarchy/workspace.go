package hierarchy

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/codervisor/devlog/internal/client"
	"github.com/codervisor/devlog/pkg/models"
	"github.com/sirupsen/logrus"
)

// WorkspaceDiscovery handles VS Code workspace discovery
type WorkspaceDiscovery struct {
	client    *client.Client
	machineID int
	log       *logrus.Logger
}

// VSCodeStorage represents the VS Code storage.json structure
type VSCodeStorage struct {
	Folder string `json:"folder,omitempty"`
	// Other fields can be added as needed
}

// NewWorkspaceDiscovery creates a new workspace discovery service
func NewWorkspaceDiscovery(client *client.Client, machineID int, log *logrus.Logger) *WorkspaceDiscovery {
	if log == nil {
		log = logrus.New()
	}
	return &WorkspaceDiscovery{
		client:    client,
		machineID: machineID,
		log:       log,
	}
}

// DiscoverAll discovers all VS Code workspaces
func (wd *WorkspaceDiscovery) DiscoverAll() ([]*models.Workspace, error) {
	// Find all VS Code workspace storage directories
	workspacePaths, err := wd.findVSCodeWorkspaces()
	if err != nil {
		return nil, fmt.Errorf("failed to find VS Code workspaces: %w", err)
	}

	wd.log.Infof("Found %d VS Code workspace directories", len(workspacePaths))

	var workspaces []*models.Workspace
	for _, path := range workspacePaths {
		ws, err := wd.processWorkspace(path)
		if err != nil {
			wd.log.Warnf("Failed to process workspace %s: %v", path, err)
			continue
		}
		if ws != nil {
			workspaces = append(workspaces, ws)
		}
	}

	wd.log.Infof("Successfully processed %d workspaces", len(workspaces))
	return workspaces, nil
}

// processWorkspace processes a single workspace directory
func (wd *WorkspaceDiscovery) processWorkspace(workspaceStoragePath string) (*models.Workspace, error) {
	// Extract workspace ID from directory name
	workspaceID := filepath.Base(workspaceStoragePath)

	// Find actual project path from storage.json
	projectPath, err := wd.resolveProjectPath(workspaceStoragePath)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve project path: %w", err)
	}

	// Verify the path exists
	if _, err := os.Stat(projectPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("project path does not exist: %s", projectPath)
	}

	// Get Git info
	gitInfo, err := GetGitInfo(projectPath)
	if err != nil {
		wd.log.Debugf("Not a Git repository or no Git info: %s (%v)", projectPath, err)
		// Non-Git projects are still valid workspaces, just skip Git info
		gitInfo = &GitInfo{
			RemoteURL: fmt.Sprintf("file://%s", projectPath),
			Branch:    "",
			Commit:    "",
		}
	}

	// Resolve project from Git remote
	project, err := wd.client.ResolveProject(gitInfo.RemoteURL)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve project: %w", err)
	}

	// Create workspace record
	workspace := &models.Workspace{
		ProjectID:     project.ID,
		MachineID:     wd.machineID,
		WorkspaceID:   workspaceID,
		WorkspacePath: projectPath,
		WorkspaceType: "folder",
		Branch:        gitInfo.Branch,
		Commit:        gitInfo.Commit,
	}

	// Register with backend
	registered, err := wd.client.UpsertWorkspace(workspace)
	if err != nil {
		return nil, fmt.Errorf("failed to register workspace: %w", err)
	}

	wd.log.WithFields(map[string]interface{}{
		"workspaceId": registered.WorkspaceID,
		"projectId":   registered.ProjectID,
		"path":        registered.WorkspacePath,
	}).Info("Workspace discovered and registered")

	return registered, nil
}

// resolveProjectPath resolves the actual project path from VS Code storage
func (wd *WorkspaceDiscovery) resolveProjectPath(workspaceStoragePath string) (string, error) {
	storageFile := filepath.Join(workspaceStoragePath, "workspace.json")

	// Try workspace.json first
	if _, err := os.Stat(storageFile); err == nil {
		data, err := os.ReadFile(storageFile)
		if err != nil {
			return "", err
		}

		var storage VSCodeStorage
		if err := json.Unmarshal(data, &storage); err != nil {
			return "", err
		}

		if storage.Folder != "" {
			// Parse URI format: file:///path/to/folder
			folder := storage.Folder
			if strings.HasPrefix(folder, "file://") {
				folder = strings.TrimPrefix(folder, "file://")
				// On Windows, remove the leading slash if present
				if runtime.GOOS == "windows" && strings.HasPrefix(folder, "/") {
					folder = folder[1:]
				}
			}
			return folder, nil
		}
	}

	// Fallback: try to find meta.json or other storage files
	metaFile := filepath.Join(workspaceStoragePath, "meta.json")
	if _, err := os.Stat(metaFile); err == nil {
		// Parse meta.json which might contain path hints
		// This is a simplified approach - you might need to enhance this
		// based on actual VS Code storage format
		return "", fmt.Errorf("workspace path resolution from meta.json not implemented")
	}

	return "", fmt.Errorf("could not resolve workspace path from %s", workspaceStoragePath)
}

// findVSCodeWorkspaces finds all VS Code workspace storage directories
func (wd *WorkspaceDiscovery) findVSCodeWorkspaces() ([]string, error) {
	basePaths := wd.getVSCodeStoragePaths()

	var workspaces []string
	for _, base := range basePaths {
		// Expand home directory
		if strings.HasPrefix(base, "~") {
			home, err := os.UserHomeDir()
			if err != nil {
				continue
			}
			base = filepath.Join(home, base[1:])
		}

		// Check if the base path exists
		if _, err := os.Stat(base); os.IsNotExist(err) {
			continue
		}

		// List all directories in the workspace storage
		entries, err := os.ReadDir(base)
		if err != nil {
			wd.log.Warnf("Failed to read directory %s: %v", base, err)
			continue
		}

		for _, entry := range entries {
			if entry.IsDir() {
				workspaces = append(workspaces, filepath.Join(base, entry.Name()))
			}
		}
	}

	return workspaces, nil
}

// getVSCodeStoragePaths returns platform-specific VS Code storage paths
func (wd *WorkspaceDiscovery) getVSCodeStoragePaths() []string {
	switch runtime.GOOS {
	case "darwin":
		return []string{
			"~/Library/Application Support/Code/User/workspaceStorage",
			"~/Library/Application Support/Code - Insiders/User/workspaceStorage",
			"~/Library/Application Support/Cursor/User/workspaceStorage",
		}
	case "linux":
		return []string{
			"~/.config/Code/User/workspaceStorage",
			"~/.config/Code - Insiders/User/workspaceStorage",
			"~/.config/Cursor/User/workspaceStorage",
		}
	case "windows":
		return []string{
			"%APPDATA%/Code/User/workspaceStorage",
			"%APPDATA%/Code - Insiders/User/workspaceStorage",
			"%APPDATA%/Cursor/User/workspaceStorage",
		}
	default:
		return []string{}
	}
}
