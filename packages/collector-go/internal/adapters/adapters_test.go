package adapters

import (
	"testing"

	"github.com/codervisor/devlog/collector/pkg/types"
)

func TestCopilotAdapter_ParseLogLine(t *testing.T) {
	adapter := NewCopilotAdapter("test-project")

	tests := []struct {
		name      string
		line      string
		wantEvent bool
		wantType  string
	}{
		{
			name:      "valid completion event",
			line:      `{"timestamp":"2025-10-30T10:00:00Z","level":"info","message":"completion accepted","source":"extension","requestId":"req-123","model":"gpt-4","prompt":"function add","completion":"function add(a, b) { return a + b; }","promptLen":12,"completionLen":35,"tokensUsed":47,"durationMs":250,"filePath":"/path/to/file.js","language":"javascript"}`,
			wantEvent: true,
			wantType:  types.EventTypeLLMResponse,
		},
		{
			name:      "empty line",
			line:      "",
			wantEvent: false,
		},
		{
			name:      "non-completion event",
			line:      `{"timestamp":"2025-10-30T10:00:00Z","level":"debug","message":"telemetry sent"}`,
			wantEvent: false,
		},
		{
			name:      "invalid json",
			line:      `not a json line`,
			wantEvent: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event, err := adapter.ParseLogLine(tt.line)

			if err != nil && tt.wantEvent {
				t.Errorf("unexpected error: %v", err)
			}

			if tt.wantEvent && event == nil {
				t.Error("expected event but got nil")
			}

			if !tt.wantEvent && event != nil {
				t.Error("expected no event but got one")
			}

			if event != nil && event.Type != tt.wantType {
				t.Errorf("expected type %s, got %s", tt.wantType, event.Type)
			}
		})
	}
}

func TestCopilotAdapter_SupportsFormat(t *testing.T) {
	adapter := NewCopilotAdapter("test-project")

	tests := []struct {
		name   string
		sample string
		want   bool
	}{
		{
			name:   "copilot json",
			sample: `{"timestamp":"2025-10-30T10:00:00Z","source":"copilot","message":"test"}`,
			want:   true,
		},
		{
			name:   "copilot mention",
			sample: `{"data":"github.copilot activity"}`,
			want:   true,
		},
		{
			name:   "invalid format",
			sample: `not json`,
			want:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := adapter.SupportsFormat(tt.sample); got != tt.want {
				t.Errorf("SupportsFormat() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestRegistry(t *testing.T) {
	registry := NewRegistry()

	adapter := NewCopilotAdapter("test-project")
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

	// Test DetectAdapter
	sample := `{"source":"copilot","message":"test"}`
	detected, err := registry.DetectAdapter(sample)
	if err != nil {
		t.Fatalf("failed to detect adapter: %v", err)
	}
	if detected.Name() != "github-copilot" {
		t.Errorf("expected github-copilot, got %s", detected.Name())
	}
}
