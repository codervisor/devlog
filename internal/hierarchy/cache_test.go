package hierarchy

import (
	"testing"

	"github.com/codervisor/devlog/pkg/models"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHierarchyCache_Initialize(t *testing.T) {
	log := logrus.New()
	log.SetLevel(logrus.ErrorLevel)

	cache := NewHierarchyCache(nil, log)

	workspaces := []*models.Workspace{
		{
			ID:          1,
			ProjectID:   10,
			MachineID:   20,
			WorkspaceID: "ws-1",
			Project:     &models.Project{FullName: "owner/repo1"},
			Machine:     &models.Machine{Hostname: "machine1"},
		},
		{
			ID:          2,
			ProjectID:   11,
			MachineID:   21,
			WorkspaceID: "ws-2",
			Project:     &models.Project{FullName: "owner/repo2"},
			Machine:     &models.Machine{Hostname: "machine2"},
		},
	}

	cache.Initialize(workspaces)

	assert.Equal(t, 2, cache.Size())

	// Verify first workspace
	ctx, err := cache.Resolve("ws-1")
	require.NoError(t, err)
	assert.Equal(t, 1, ctx.WorkspaceID)
	assert.Equal(t, 10, ctx.ProjectID)
	assert.Equal(t, 20, ctx.MachineID)
	assert.Equal(t, "owner/repo1", ctx.ProjectName)
	assert.Equal(t, "machine1", ctx.MachineName)

	// Verify second workspace
	ctx, err = cache.Resolve("ws-2")
	require.NoError(t, err)
	assert.Equal(t, 2, ctx.WorkspaceID)
	assert.Equal(t, 11, ctx.ProjectID)
	assert.Equal(t, 21, ctx.MachineID)
}

func TestHierarchyCache_Resolve_CacheHit(t *testing.T) {
	log := logrus.New()
	log.SetLevel(logrus.ErrorLevel)

	cache := NewHierarchyCache(nil, log)

	workspaces := []*models.Workspace{
		{
			ID:          1,
			ProjectID:   10,
			MachineID:   20,
			WorkspaceID: "ws-1",
		},
	}

	cache.Initialize(workspaces)

	// First resolve - cache hit
	ctx, err := cache.Resolve("ws-1")
	require.NoError(t, err)
	assert.Equal(t, 1, ctx.WorkspaceID)

	// Second resolve - should also be cache hit
	ctx2, err := cache.Resolve("ws-1")
	require.NoError(t, err)
	assert.Equal(t, ctx, ctx2)
}

func TestHierarchyCache_Add(t *testing.T) {
	log := logrus.New()
	log.SetLevel(logrus.ErrorLevel)

	cache := NewHierarchyCache(nil, log)

	// Initially empty
	assert.Equal(t, 0, cache.Size())

	// Add a workspace
	workspace := &models.Workspace{
		ID:          1,
		ProjectID:   10,
		MachineID:   20,
		WorkspaceID: "ws-1",
		Project:     &models.Project{FullName: "owner/repo"},
		Machine:     &models.Machine{Hostname: "machine1"},
	}

	cache.Add(workspace)

	assert.Equal(t, 1, cache.Size())

	// Verify it can be resolved
	ctx, err := cache.Resolve("ws-1")
	require.NoError(t, err)
	assert.Equal(t, 1, ctx.WorkspaceID)
	assert.Equal(t, "owner/repo", ctx.ProjectName)
}

func TestHierarchyCache_Remove(t *testing.T) {
	log := logrus.New()
	log.SetLevel(logrus.ErrorLevel)

	cache := NewHierarchyCache(nil, log)

	workspaces := []*models.Workspace{
		{
			ID:          1,
			ProjectID:   10,
			MachineID:   20,
			WorkspaceID: "ws-1",
		},
		{
			ID:          2,
			ProjectID:   11,
			MachineID:   21,
			WorkspaceID: "ws-2",
		},
	}

	cache.Initialize(workspaces)
	assert.Equal(t, 2, cache.Size())

	// Remove one workspace
	cache.Remove("ws-1")
	assert.Equal(t, 1, cache.Size())

	// Note: Can't test Resolve("ws-1") without a mock client
	// since it will try to lazy-load from backend
	// Just verify the size decreased and ws-2 is still accessible
	ctx, err := cache.Resolve("ws-2")
	require.NoError(t, err)
	assert.Equal(t, 2, ctx.WorkspaceID)
}

func TestHierarchyCache_Clear(t *testing.T) {
	log := logrus.New()
	log.SetLevel(logrus.ErrorLevel)

	cache := NewHierarchyCache(nil, log)

	workspaces := []*models.Workspace{
		{
			ID:          1,
			ProjectID:   10,
			MachineID:   20,
			WorkspaceID: "ws-1",
		},
		{
			ID:          2,
			ProjectID:   11,
			MachineID:   21,
			WorkspaceID: "ws-2",
		},
	}

	cache.Initialize(workspaces)
	assert.Equal(t, 2, cache.Size())

	// Clear cache
	cache.Clear()
	assert.Equal(t, 0, cache.Size())

	// Note: Can't test Resolve after clear without a mock client
	// since it will try to lazy-load from backend
	// Just verify the size is 0
}

func TestHierarchyCache_GetAll(t *testing.T) {
	log := logrus.New()
	log.SetLevel(logrus.ErrorLevel)

	cache := NewHierarchyCache(nil, log)

	workspaces := []*models.Workspace{
		{
			ID:          1,
			ProjectID:   10,
			MachineID:   20,
			WorkspaceID: "ws-1",
		},
		{
			ID:          2,
			ProjectID:   11,
			MachineID:   21,
			WorkspaceID: "ws-2",
		},
	}

	cache.Initialize(workspaces)

	all := cache.GetAll()
	assert.Equal(t, 2, len(all))
	assert.Contains(t, all, "ws-1")
	assert.Contains(t, all, "ws-2")

	// Verify it's a copy (modifying the returned map shouldn't affect cache)
	delete(all, "ws-1")
	assert.Equal(t, 2, cache.Size())
}

func TestHierarchyCache_ConcurrentAccess(t *testing.T) {
	log := logrus.New()
	log.SetLevel(logrus.ErrorLevel)

	cache := NewHierarchyCache(nil, log)

	workspaces := []*models.Workspace{
		{
			ID:          1,
			ProjectID:   10,
			MachineID:   20,
			WorkspaceID: "ws-1",
		},
	}

	cache.Initialize(workspaces)

	// Test concurrent reads
	done := make(chan bool, 10)
	for i := 0; i < 10; i++ {
		go func() {
			_, _ = cache.Resolve("ws-1")
			done <- true
		}()
	}

	// Wait for all goroutines
	for i := 0; i < 10; i++ {
		<-done
	}

	// Test concurrent writes
	for i := 0; i < 10; i++ {
		go func(i int) {
			ws := &models.Workspace{
				ID:          i,
				ProjectID:   i * 10,
				MachineID:   i * 20,
				WorkspaceID: "ws-concurrent",
			}
			cache.Add(ws)
			done <- true
		}(i)
	}

	// Wait for all goroutines
	for i := 0; i < 10; i++ {
		<-done
	}

	// Verify cache is still functional
	assert.Greater(t, cache.Size(), 0)
}
