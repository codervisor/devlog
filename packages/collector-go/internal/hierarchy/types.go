package hierarchy

import "time"

// Project represents a Git repository/project
type Project struct {
	ID          int       `json:"id,omitempty"`
	Name        string    `json:"name"`
	FullName    string    `json:"fullName"`
	RepoURL     string    `json:"repoUrl"`
	RepoOwner   string    `json:"repoOwner"`
	RepoName    string    `json:"repoName"`
	Description string    `json:"description,omitempty"`
	CreatedAt   time.Time `json:"createdAt,omitempty"`
	UpdatedAt   time.Time `json:"updatedAt,omitempty"`
}

// Workspace represents a VS Code workspace
type Workspace struct {
	ID            int       `json:"id,omitempty"`
	ProjectID     int       `json:"projectId"`
	MachineID     int       `json:"machineId"`
	WorkspaceID   string    `json:"workspaceId"`
	WorkspacePath string    `json:"workspacePath"`
	WorkspaceType string    `json:"workspaceType"`
	Branch        string    `json:"branch,omitempty"`
	Commit        string    `json:"commit,omitempty"`
	CreatedAt     time.Time `json:"createdAt,omitempty"`
	LastSeenAt    time.Time `json:"lastSeenAt,omitempty"`
	Project       *Project  `json:"project,omitempty"`
	Machine       *Machine  `json:"machine,omitempty"`
}
