package types

import "testing"

func TestEventTypeConstants(t *testing.T) {
	tests := []struct {
		name     string
		eventType string
		expected string
	}{
		{"LLM Request", EventTypeLLMRequest, "llm_request"},
		{"LLM Response", EventTypeLLMResponse, "llm_response"},
		{"Tool Use", EventTypeToolUse, "tool_use"},
		{"File Read", EventTypeFileRead, "file_read"},
		{"File Write", EventTypeFileWrite, "file_write"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.eventType != tt.expected {
				t.Errorf("Expected %s, got %s", tt.expected, tt.eventType)
			}
		})
	}
}

func TestAgentEventStructure(t *testing.T) {
	event := AgentEvent{
		ID:        "test-id",
		Type:      EventTypeLLMRequest,
		AgentID:   "copilot",
		SessionID: "session-123",
		Data:      make(map[string]interface{}),
	}

	if event.ID != "test-id" {
		t.Errorf("Expected ID to be 'test-id', got %s", event.ID)
	}

	if event.Type != EventTypeLLMRequest {
		t.Errorf("Expected Type to be '%s', got %s", EventTypeLLMRequest, event.Type)
	}
}
