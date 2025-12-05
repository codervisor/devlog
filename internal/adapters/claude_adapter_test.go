package adapters

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/codervisor/devlog/pkg/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestClaudeAdapter_ParseLogLine(t *testing.T) {
	adapter := NewClaudeAdapter("test-project", nil, nil)

	tests := []struct {
		name          string
		line          string
		expectEvent   bool
		expectedType  string
		expectedData  map[string]interface{}
	}{
		{
			name: "LLM Request",
			line: `{"timestamp":"2025-10-31T10:00:00Z","type":"llm_request","conversation_id":"conv_123","model":"claude-3-sonnet","prompt":"Write a hello world program","prompt_tokens":5}`,
			expectEvent:  true,
			expectedType: types.EventTypeLLMRequest,
			expectedData: map[string]interface{}{
				"prompt": "Write a hello world program",
			},
		},
		{
			name: "LLM Response",
			line: `{"timestamp":"2025-10-31T10:00:01Z","type":"llm_response","conversation_id":"conv_123","response":"Here's a hello world program","response_tokens":6}`,
			expectEvent:  true,
			expectedType: types.EventTypeLLMResponse,
			expectedData: map[string]interface{}{
				"response": "Here's a hello world program",
			},
		},
		{
			name: "Tool Use",
			line: `{"timestamp":"2025-10-31T10:00:02Z","type":"tool_use","conversation_id":"conv_123","tool_name":"read_file","tool_input":{"path":"test.txt"}}`,
			expectEvent:  true,
			expectedType: types.EventTypeToolUse,
			expectedData: map[string]interface{}{
				"toolName": "read_file",
			},
		},
		{
			name: "File Read",
			line: `{"timestamp":"2025-10-31T10:00:03Z","type":"file_read","file_path":"/workspace/test.go","action":"read"}`,
			expectEvent:  true,
			expectedType: types.EventTypeFileRead,
			expectedData: map[string]interface{}{
				"filePath": "/workspace/test.go",
			},
		},
		{
			name:        "Empty line",
			line:        "",
			expectEvent: false,
		},
		{
			name:        "Invalid JSON",
			line:        "not json",
			expectEvent: false,
		},
		{
			name:        "Irrelevant log",
			line:        `{"timestamp":"2025-10-31T10:00:00Z","level":"debug","message":"Starting service"}`,
			expectEvent: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event, err := adapter.ParseLogLine(tt.line)

			if tt.expectEvent {
				require.NoError(t, err)
				require.NotNil(t, event, "Expected an event")
				assert.Equal(t, tt.expectedType, event.Type, "Event type mismatch")
				assert.Equal(t, "claude", event.AgentID)

				// Check expected data fields
				for key, expectedValue := range tt.expectedData {
					actualValue, ok := event.Data[key]
					assert.True(t, ok, "Expected data field %s not found", key)
					if ok {
						assert.Equal(t, expectedValue, actualValue, "Data field %s mismatch", key)
					}
				}
			} else {
				// Either nil event or error
				if err != nil {
					assert.Nil(t, event)
				} else if event != nil {
					t.Errorf("Expected no event, but got one: %+v", event)
				}
			}
		})
	}
}

func TestClaudeAdapter_ParseLogFile(t *testing.T) {
	adapter := NewClaudeAdapter("test-project", nil, nil)

	// Create test JSONL file
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "claude-test.jsonl")

	logLines := []string{
		`{"timestamp":"2025-10-31T10:00:00Z","type":"llm_request","conversation_id":"conv_123","prompt":"Hello","prompt_tokens":1}`,
		`{"timestamp":"2025-10-31T10:00:01Z","type":"llm_response","conversation_id":"conv_123","response":"Hi there!","response_tokens":2}`,
		`{"timestamp":"2025-10-31T10:00:02Z","type":"tool_use","conversation_id":"conv_123","tool_name":"search","tool_input":"test"}`,
		`{"timestamp":"2025-10-31T10:00:03Z","level":"debug","message":"Debug info"}`, // Should be skipped
	}

	content := ""
	for _, line := range logLines {
		content += line + "\n"
	}

	err := os.WriteFile(testFile, []byte(content), 0644)
	require.NoError(t, err)

	// Parse the file
	events, err := adapter.ParseLogFile(testFile)
	require.NoError(t, err)
	
	// Should have 3 events (debug line skipped)
	assert.Equal(t, 3, len(events), "Should extract 3 events")

	// Verify event types
	eventTypes := make(map[string]int)
	for _, event := range events {
		eventTypes[event.Type]++
	}

	assert.Equal(t, 1, eventTypes[types.EventTypeLLMRequest], "Should have 1 request")
	assert.Equal(t, 1, eventTypes[types.EventTypeLLMResponse], "Should have 1 response")
	assert.Equal(t, 1, eventTypes[types.EventTypeToolUse], "Should have 1 tool use")
}

func TestClaudeAdapter_DetectEventType(t *testing.T) {
	adapter := NewClaudeAdapter("test-project", nil, nil)

	tests := []struct {
		name     string
		entry    ClaudeLogEntry
		expected string
	}{
		{
			name:     "Explicit llm_request type",
			entry:    ClaudeLogEntry{Type: "llm_request"},
			expected: types.EventTypeLLMRequest,
		},
		{
			name:     "Explicit tool_use type",
			entry:    ClaudeLogEntry{Type: "tool_use"},
			expected: types.EventTypeToolUse,
		},
		{
			name:     "Infer from prompt field",
			entry:    ClaudeLogEntry{Prompt: "Test prompt", Message: "Processing request"},
			expected: types.EventTypeLLMRequest,
		},
		{
			name:     "Infer from response field",
			entry:    ClaudeLogEntry{Response: "Test response", Message: "Processing response"},
			expected: types.EventTypeLLMResponse,
		},
		{
			name:     "Infer from tool_name field",
			entry:    ClaudeLogEntry{ToolName: "read_file", Message: "Using tool"},
			expected: types.EventTypeToolUse,
		},
		{
			name:     "Infer file read from file_path and action",
			entry:    ClaudeLogEntry{FilePath: "/test.go", Action: "read"},
			expected: types.EventTypeFileRead,
		},
		{
			name:     "Infer file write from file_path and action",
			entry:    ClaudeLogEntry{FilePath: "/test.go", Action: "write"},
			expected: types.EventTypeFileWrite,
		},
		{
			name:     "Unknown type",
			entry:    ClaudeLogEntry{Message: "Generic log message"},
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := adapter.detectEventType(&tt.entry)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestClaudeAdapter_ParseTimestamp(t *testing.T) {
	adapter := NewClaudeAdapter("test-project", nil, nil)

	tests := []struct {
		name     string
		input    interface{}
		checkFn  func(*testing.T, time.Time)
	}{
		{
			name:  "RFC3339 string",
			input: "2025-10-31T10:00:00Z",
			checkFn: func(t *testing.T, ts time.Time) {
				assert.Equal(t, 2025, ts.Year())
				assert.Equal(t, time.October, ts.Month())
				assert.Equal(t, 31, ts.Day())
			},
		},
		{
			name:  "Unix timestamp (int64)",
			input: int64(1730372400),
			checkFn: func(t *testing.T, ts time.Time) {
				assert.True(t, ts.Unix() == 1730372400)
			},
		},
		{
			name:  "Unix timestamp (float64)",
			input: float64(1730372400),
			checkFn: func(t *testing.T, ts time.Time) {
				assert.True(t, ts.Unix() == 1730372400)
			},
		},
		{
			name:  "Invalid input",
			input: "invalid",
			checkFn: func(t *testing.T, ts time.Time) {
				// Should return current time, just check it's recent
				assert.WithinDuration(t, time.Now(), ts, 5*time.Second)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := adapter.parseTimestamp(tt.input)
			tt.checkFn(t, result)
		})
	}
}

func TestClaudeAdapter_SupportsFormat(t *testing.T) {
	adapter := NewClaudeAdapter("test-project", nil, nil)

	tests := []struct {
		name   string
		sample string
		want   bool
	}{
		{
			name:   "Valid Claude log with conversation_id",
			sample: `{"timestamp":"2025-10-31T10:00:00Z","conversation_id":"conv_123","message":"test"}`,
			want:   true,
		},
		{
			name:   "Valid Claude log with model",
			sample: `{"timestamp":"2025-10-31T10:00:00Z","model":"claude-3-sonnet","message":"test"}`,
			want:   true,
		},
		{
			name:   "Valid Claude log with claude in message",
			sample: `{"timestamp":"2025-10-31T10:00:00Z","message":"Claude is processing"}`,
			want:   true,
		},
		{
			name:   "Invalid JSON",
			sample: "not json",
			want:   false,
		},
		{
			name:   "Generic log without Claude markers",
			sample: `{"timestamp":"2025-10-31T10:00:00Z","level":"info","message":"Generic log"}`,
			want:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := adapter.SupportsFormat(tt.sample)
			assert.Equal(t, tt.want, result)
		})
	}
}

func TestClaudeAdapter_ExtractMetrics(t *testing.T) {
	adapter := NewClaudeAdapter("test-project", nil, nil)

	tests := []struct {
		name     string
		entry    ClaudeLogEntry
		expected *types.EventMetrics
	}{
		{
			name: "With token counts",
			entry: ClaudeLogEntry{
				PromptTokens:   100,
				ResponseTokens: 150,
				TokensUsed:     250,
			},
			expected: &types.EventMetrics{
				PromptTokens:   100,
				ResponseTokens: 150,
				TokenCount:     250,
			},
		},
		{
			name:     "No token counts",
			entry:    ClaudeLogEntry{},
			expected: nil,
		},
		{
			name: "Only total tokens",
			entry: ClaudeLogEntry{
				TokensUsed: 300,
			},
			expected: &types.EventMetrics{
				TokenCount: 300,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := adapter.extractMetrics(&tt.entry)
			if tt.expected == nil {
				assert.Nil(t, result)
			} else {
				require.NotNil(t, result)
				assert.Equal(t, tt.expected.TokenCount, result.TokenCount)
				assert.Equal(t, tt.expected.PromptTokens, result.PromptTokens)
				assert.Equal(t, tt.expected.ResponseTokens, result.ResponseTokens)
			}
		})
	}
}

func TestClaudeAdapter_IntegrationWithHierarchy(t *testing.T) {
	// This test demonstrates how the adapter would work with hierarchy
	// In practice, this would need actual hierarchy cache setup

	adapter := NewClaudeAdapter("test-project", nil, nil)

	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "claude-test.jsonl")

	logLine := `{"timestamp":"2025-10-31T10:00:00Z","type":"llm_request","conversation_id":"conv_123","prompt":"Test","prompt_tokens":1}`
	err := os.WriteFile(testFile, []byte(logLine+"\n"), 0644)
	require.NoError(t, err)

	events, err := adapter.ParseLogFile(testFile)
	require.NoError(t, err)
	require.Len(t, events, 1)

	// Without hierarchy, should have legacy project ID only
	event := events[0]
	assert.Equal(t, "test-project", event.LegacyProjectID)
	assert.Equal(t, 0, event.ProjectID) // Not set
	assert.Equal(t, 0, event.MachineID) // Not set
	assert.Equal(t, 0, event.WorkspaceID) // Not set
}
