package hierarchy

import (
	"fmt"
	"sync"

	"github.com/codervisor/devlog/internal/client"
	"github.com/codervisor/devlog/pkg/models"
	"github.com/sirupsen/logrus"
)

// WorkspaceContext contains resolved workspace hierarchy information
type WorkspaceContext struct {
	ProjectID   int
	MachineID   int
	WorkspaceID int
	ProjectName string
	MachineName string
}

// HierarchyCache provides fast lookups for workspace context
type HierarchyCache struct {
	workspaces map[string]*WorkspaceContext
	mu         sync.RWMutex
	client     *client.Client
	log        *logrus.Logger
}

// NewHierarchyCache creates a new hierarchy cache
func NewHierarchyCache(client *client.Client, log *logrus.Logger) *HierarchyCache {
	if log == nil {
		log = logrus.New()
	}
	return &HierarchyCache{
		workspaces: make(map[string]*WorkspaceContext),
		client:     client,
		log:        log,
	}
}

// Initialize populates the cache with workspaces
func (hc *HierarchyCache) Initialize(workspaces []*models.Workspace) {
	hc.mu.Lock()
	defer hc.mu.Unlock()

	for _, ws := range workspaces {
		ctx := &WorkspaceContext{
			ProjectID:   ws.ProjectID,
			MachineID:   ws.MachineID,
			WorkspaceID: ws.ID,
		}

		// Add project name if available
		if ws.Project != nil {
			ctx.ProjectName = ws.Project.FullName
		}

		// Add machine name if available
		if ws.Machine != nil {
			ctx.MachineName = ws.Machine.Hostname
		}

		hc.workspaces[ws.WorkspaceID] = ctx
	}

	hc.log.Infof("Hierarchy cache initialized with %d workspaces", len(hc.workspaces))
}

// Resolve looks up workspace context, with lazy loading from backend
func (hc *HierarchyCache) Resolve(workspaceID string) (*WorkspaceContext, error) {
	// Try cache first
	hc.mu.RLock()
	ctx, ok := hc.workspaces[workspaceID]
	hc.mu.RUnlock()

	if ok {
		hc.log.Debugf("Cache hit for workspace: %s", workspaceID)
		return ctx, nil
	}

	hc.log.Debugf("Cache miss for workspace: %s, loading from backend", workspaceID)

	// Lazy load from backend
	workspace, err := hc.client.GetWorkspace(workspaceID)
	if err != nil {
		return nil, fmt.Errorf("workspace not found: %w", err)
	}

	ctx = &WorkspaceContext{
		ProjectID:   workspace.ProjectID,
		MachineID:   workspace.MachineID,
		WorkspaceID: workspace.ID,
	}

	// Load additional info if needed
	if workspace.Project != nil {
		ctx.ProjectName = workspace.Project.FullName
	} else {
		ctx.ProjectName = "unknown"
	}

	if workspace.Machine != nil {
		ctx.MachineName = workspace.Machine.Hostname
	} else {
		ctx.MachineName = "unknown"
	}

	// Cache it
	hc.mu.Lock()
	hc.workspaces[workspaceID] = ctx
	hc.mu.Unlock()

	return ctx, nil
}

// Refresh re-fetches all workspaces from backend
func (hc *HierarchyCache) Refresh() error {
	hc.log.Info("Refreshing hierarchy cache from backend")

	// Re-fetch all workspaces from backend
	workspaces, err := hc.client.ListWorkspaces()
	if err != nil {
		return fmt.Errorf("failed to list workspaces: %w", err)
	}

	// Reinitialize cache
	hc.Initialize(workspaces)

	return nil
}

// Add adds or updates a workspace in the cache
func (hc *HierarchyCache) Add(workspace *models.Workspace) {
	hc.mu.Lock()
	defer hc.mu.Unlock()

	ctx := &WorkspaceContext{
		ProjectID:   workspace.ProjectID,
		MachineID:   workspace.MachineID,
		WorkspaceID: workspace.ID,
	}

	if workspace.Project != nil {
		ctx.ProjectName = workspace.Project.FullName
	}

	if workspace.Machine != nil {
		ctx.MachineName = workspace.Machine.Hostname
	}

	hc.workspaces[workspace.WorkspaceID] = ctx

	hc.log.Debugf("Added workspace to cache: %s", workspace.WorkspaceID)
}

// Remove removes a workspace from the cache
func (hc *HierarchyCache) Remove(workspaceID string) {
	hc.mu.Lock()
	defer hc.mu.Unlock()

	delete(hc.workspaces, workspaceID)

	hc.log.Debugf("Removed workspace from cache: %s", workspaceID)
}

// Clear clears the entire cache
func (hc *HierarchyCache) Clear() {
	hc.mu.Lock()
	defer hc.mu.Unlock()

	hc.workspaces = make(map[string]*WorkspaceContext)

	hc.log.Info("Hierarchy cache cleared")
}

// Size returns the number of workspaces in the cache
func (hc *HierarchyCache) Size() int {
	hc.mu.RLock()
	defer hc.mu.RUnlock()

	return len(hc.workspaces)
}

// GetAll returns all workspace contexts in the cache
func (hc *HierarchyCache) GetAll() map[string]*WorkspaceContext {
	hc.mu.RLock()
	defer hc.mu.RUnlock()

	// Return a copy to avoid concurrent modification
	copy := make(map[string]*WorkspaceContext, len(hc.workspaces))
	for k, v := range hc.workspaces {
		copy[k] = v
	}

	return copy
}
