package adapters

import (
	"fmt"
	"sync"
)

// Registry manages available agent adapters
type Registry struct {
	mu       sync.RWMutex
	adapters map[string]AgentAdapter
}

// NewRegistry creates a new adapter registry
func NewRegistry() *Registry {
	return &Registry{
		adapters: make(map[string]AgentAdapter),
	}
}

// Register registers a new adapter
func (r *Registry) Register(adapter AgentAdapter) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	name := adapter.Name()
	if _, exists := r.adapters[name]; exists {
		return fmt.Errorf("adapter %s already registered", name)
	}

	r.adapters[name] = adapter
	return nil
}

// Get retrieves an adapter by name
func (r *Registry) Get(name string) (AgentAdapter, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	adapter, exists := r.adapters[name]
	if !exists {
		return nil, fmt.Errorf("adapter %s not found", name)
	}

	return adapter, nil
}

// List returns all registered adapter names
func (r *Registry) List() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()

	names := make([]string, 0, len(r.adapters))
	for name := range r.adapters {
		names = append(names, name)
	}

	return names
}

// DetectAdapter tries to detect which adapter to use for a log sample
func (r *Registry) DetectAdapter(sample string) (AgentAdapter, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, adapter := range r.adapters {
		if adapter.SupportsFormat(sample) {
			return adapter, nil
		}
	}

	return nil, fmt.Errorf("no adapter found for log format")
}

// DefaultRegistry creates and populates a registry with all available adapters
func DefaultRegistry(projectID string) *Registry {
	registry := NewRegistry()

	// Register Copilot adapter
	registry.Register(NewCopilotAdapter(projectID))

	// TODO: Register other adapters (Claude, Cursor, etc.)

	return registry
}
