package adapters

import (
	"github.com/codervisor/devlog/pkg/types"
)

// AgentAdapter defines the interface for parsing agent-specific log formats
type AgentAdapter interface {
	// Name returns the adapter name (e.g., "copilot", "claude", "cursor")
	Name() string

	// ParseLogLine parses a single log line and returns an AgentEvent if applicable
	// Returns nil if the line doesn't contain a relevant event
	ParseLogLine(line string) (*types.AgentEvent, error)

	// ParseLogFile parses an entire log file and returns all events
	ParseLogFile(filePath string) ([]*types.AgentEvent, error)

	// SupportsFormat checks if this adapter can handle the given log format
	SupportsFormat(sample string) bool
}

// BaseAdapter provides common functionality for all adapters
type BaseAdapter struct {
	name      string
	projectID string
}

// NewBaseAdapter creates a new base adapter
func NewBaseAdapter(name, projectID string) *BaseAdapter {
	return &BaseAdapter{
		name:      name,
		projectID: projectID,
	}
}

// Name returns the adapter name
func (b *BaseAdapter) Name() string {
	return b.name
}

// ProjectID returns the configured project ID
func (b *BaseAdapter) ProjectID() string {
	return b.projectID
}
