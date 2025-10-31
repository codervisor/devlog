package adapters

import (
	"testing"
)

func TestRegistry(t *testing.T) {
	registry := NewRegistry()

	adapter := NewCopilotAdapter("test-project", nil, nil)
	if err := registry.Register(adapter); err != nil {
		t.Fatalf("failed to register adapter: %v", err)
	}

	// Test Get
	retrieved, err := registry.Get("github-copilot")
	if err != nil {
		t.Fatalf("failed to get adapter: %v", err)
	}
	if retrieved.Name() != "github-copilot" {
		t.Errorf("expected name github-copilot, got %s", retrieved.Name())
	}

	// Test List
	names := registry.List()
	if len(names) != 1 || names[0] != "github-copilot" {
		t.Errorf("expected [github-copilot], got %v", names)
	}

	// Test duplicate registration
	if err := registry.Register(adapter); err == nil {
		t.Error("expected error for duplicate registration")
	}

	// Test DetectAdapter with chat session format
	sample := `{"version": 3, "requesterUsername": "test", "requests": [{}]}`
	detected, err := registry.DetectAdapter(sample)
	if err != nil {
		t.Fatalf("failed to detect adapter: %v", err)
	}
	if detected.Name() != "github-copilot" {
		t.Errorf("expected github-copilot, got %s", detected.Name())
	}
}
