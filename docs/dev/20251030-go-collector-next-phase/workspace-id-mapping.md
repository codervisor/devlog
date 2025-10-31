# VS Code Workspace ID Mapping Guide

**Created**: October 31, 2025  
**Purpose**: Understand how to map VS Code workspace IDs to actual projects/repositories

---

## 🎯 Problem Statement

When collecting Copilot chat sessions, we have:
- **Chat session files** organized by workspace ID (e.g., `487fd76abf5d5f8744f78317893cc477`)
- **Need to know**: Which project/repository does each workspace belong to?

This is essential for:
1. Associating events with the correct project in the database
2. Providing context about which codebase was being worked on
3. Filtering and analyzing events by project

---

## 📂 Workspace Storage Structure

VS Code stores workspace-specific data in:

```
~/Library/Application Support/Code/User/workspaceStorage/
├── {workspace-id-1}/
│   ├── workspace.json          ← Contains folder/workspace path!
│   ├── chatSessions/
│   │   ├── {session-uuid-1}.json
│   │   └── {session-uuid-2}.json
│   └── ... (other VS Code data)
├── {workspace-id-2}/
│   └── ...
```

**Key Insight**: Each workspace directory contains a `workspace.json` file with the actual project path!

---

## 🗺️ Workspace Metadata Format

### Single Folder Workspace

```json
{
  "folder": "file:///Users/username/projects/owner/repo-name"
}
```

### Multi-Root Workspace

```json
{
  "workspace": "file:///Users/username/projects/owner/project.code-workspace"
}
```

---

## 🔍 Implementation Strategy

### Step 1: Read Workspace Metadata

For each workspace directory, read `workspace.json`:

```go
type WorkspaceMetadata struct {
    Folder    string `json:"folder"`    // For single-folder workspaces
    Workspace string `json:"workspace"` // For multi-root workspaces
}

func readWorkspaceMetadata(workspaceID string) (*WorkspaceMetadata, error) {
    path := filepath.Join(vscodeStoragePath, workspaceID, "workspace.json")
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, err
    }
    
    var meta WorkspaceMetadata
    err = json.Unmarshal(data, &meta)
    return &meta, err
}
```

### Step 2: Extract Project Path

```go
func getProjectPath(meta *WorkspaceMetadata) string {
    if meta.Folder != "" {
        return cleanURI(meta.Folder)
    }
    if meta.Workspace != "" {
        return cleanURI(meta.Workspace)
    }
    return ""
}

func cleanURI(uri string) string {
    // Remove file:// prefix
    uri = strings.TrimPrefix(uri, "file://")
    
    // Decode URL encoding
    uri = strings.ReplaceAll(uri, "%20", " ")
    // Add more decodings as needed
    
    return uri
}
```

### Step 3: Extract Git Repository Info

Once you have the project path, extract git information:

```go
func getGitInfo(projectPath string) (*GitInfo, error) {
    // Get remote URL
    cmd := exec.Command("git", "-C", projectPath, "remote", "get-url", "origin")
    output, err := cmd.Output()
    if err != nil {
        return nil, err
    }
    
    remoteURL := strings.TrimSpace(string(output))
    
    // Parse owner/repo from URL
    // git@github.com:owner/repo.git -> owner/repo
    // https://github.com/owner/repo.git -> owner/repo
    owner, repo := parseGitURL(remoteURL)
    
    return &GitInfo{
        RemoteURL: remoteURL,
        Owner:     owner,
        RepoName:  repo,
    }, nil
}
```

### Step 4: Associate Events with Project

When parsing chat sessions:

```go
func (a *CopilotAdapter) ParseLogFile(filePath string) ([]*types.AgentEvent, error) {
    // Extract workspace ID from file path
    workspaceID := extractWorkspaceID(filePath)
    
    // Get project info
    projectInfo := getProjectInfo(workspaceID)
    
    // Parse events and add project context
    events, err := a.parseChatSessionFile(filePath)
    for _, event := range events {
        event.ProjectID = projectInfo.ID
        event.Context["projectPath"] = projectInfo.Path
        event.Context["repoName"] = projectInfo.RepoName
        event.Context["repoOwner"] = projectInfo.Owner
    }
    
    return events, nil
}
```

---

## 📊 Example Mapping

Using the workspace mapper utility:

```bash
$ go run cmd/workspace-mapper/main.go

Workspace ID                      | Type       | Project Name              | Path
----------------------------------|------------|---------------------------|------------------
7231726a3fbbc45e361bffad4fcc5cf9  | folder     | devlog                    | /Users/.../codervisor/devlog
487fd76abf5d5f8744f78317893cc477  | folder     | devlog                    | /Users/.../tikazyq/devlog
5987bb38e8bfe2022dbffb3d3bdd5fd7  | multi-root | crawlab-pro               | /Users/.../crawlab-pro.code-workspace
```

**Note**: Multiple workspace IDs can point to the same project (e.g., opened in different VS Code instances or profiles).

---

## 🏗️ Integration with Collector

### Option 1: Pre-scan on Startup

```go
// On collector startup
func (c *Collector) Initialize() error {
    // Build workspace ID -> project mapping
    c.workspaceMap = buildWorkspaceMap()
    
    // Watch for new workspaces
    c.watchWorkspaces()
    
    return nil
}
```

### Option 2: Lazy Loading

```go
// Cache workspace info as needed
var workspaceCache = make(map[string]*ProjectInfo)

func getProjectInfo(workspaceID string) *ProjectInfo {
    if info, ok := workspaceCache[workspaceID]; ok {
        return info
    }
    
    info := readWorkspaceInfo(workspaceID)
    workspaceCache[workspaceID] = info
    return info
}
```

### Option 3: Index All Workspaces

```go
// Periodically scan all workspaces
func (c *Collector) indexWorkspaces() {
    workspaces := scanAllWorkspaces()
    
    for _, ws := range workspaces {
        c.database.UpsertProject(&Project{
            WorkspaceID: ws.ID,
            Path:        ws.Path,
            RepoOwner:   ws.GitInfo.Owner,
            RepoName:    ws.GitInfo.RepoName,
            RepoURL:     ws.GitInfo.RemoteURL,
        })
    }
}
```

---

## 🎯 Recommended Approach

1. **On collector initialization**: Scan all existing workspaces and build initial mapping
2. **During event parsing**: Look up project info from cache/database
3. **Store in database**: Create a `projects` table with workspace_id → project info mapping
4. **On event ingestion**: Add project context to each event

```sql
CREATE TABLE projects (
    id INTEGER PRIMARY KEY,
    workspace_id TEXT UNIQUE NOT NULL,
    path TEXT NOT NULL,
    repo_owner TEXT,
    repo_name TEXT,
    repo_url TEXT,
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workspace_id ON projects(workspace_id);
```

---

## 🚀 Testing

The workspace mapper utility demonstrates the mapping:

```bash
cd packages/collector-go
go run cmd/workspace-mapper/main.go
```

This shows:
- All discovered workspaces
- Their types (folder vs multi-root)
- Project paths
- Example git integration

---

## 💡 Key Takeaways

1. **Workspace ID** = Directory name in `workspaceStorage/`
2. **workspace.json** = Contains the actual project path
3. **Git info** = Can be extracted from the project path
4. **Mapping** = Read once, cache, and reuse throughout event processing
5. **Multiple IDs** = Same project can have multiple workspace IDs (different instances/profiles)

This mapping allows us to enrich Copilot events with project context, making them much more valuable for analysis and tracking!
