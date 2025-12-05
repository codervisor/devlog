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

func TestCursorAdapter_ParseLogLine(t *testing.T) {
	adapter := NewCursorAdapter("test-project", nil, nil)

	tests := []struct {
		name          string
		line          string
		expectEvent   bool
		expectedType  string
	}{
		{
			name:         "JSON LLM Request",
			line:         `{"timestamp":"2025-10-31T10:00:00Z","type":"llm_request","session_id":"sess_123","prompt":"Test prompt","prompt_tokens":2}`,
			expectEvent:  true,
			expectedType: types.EventTypeLLMRequest,
		},
		{
			name:         "JSON LLM Response",
			line:         `{"timestamp":"2025-10-31T10:00:01Z","type":"llm_response","session_id":"sess_123","response":"Test response","completion_tokens":2}`,
			expectEvent:  true,
			expectedType: types.EventTypeLLMResponse,
		},
		{
			name:         "JSON Tool Use",
			line:         `{"timestamp":"2025-10-31T10:00:02Z","type":"tool_use","tool":"read_file","tool_args":{"path":"test.txt"}}`,
			expectEvent:  true,
			expectedType: types.EventTypeToolUse,
		},
		{
			name:         "Plain text AI-related log",
			line:         "[2025-10-31 10:00:00] INFO Cursor AI completion requested",
			expectEvent:  true,
			expectedType: types.EventTypeUserInteraction,
		},
		{
			name:        "Empty line",
			line:        "",
			expectEvent: false,
		},
		{
			name:        "Irrelevant log",
			line:        "[2025-10-31 10:00:00] DEBUG System startup",
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
				assert.Equal(t, "cursor", event.AgentID)
			} else {
				if err != nil {
					assert.Nil(t, event)
				} else if event != nil {
					t.Errorf("Expected no event, but got one: %+v", event)
				}
			}
		})
	}
}

func TestCursorAdapter_ParseLogFile(t *testing.T) {
	adapter := NewCursorAdapter("test-project", nil, nil)

	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "cursor-test.log")

	logLines := []string{
		`{"timestamp":"2025-10-31T10:00:00Z","type":"llm_request","session_id":"sess_123","prompt":"Hello","prompt_tokens":1}`,
		`{"timestamp":"2025-10-31T10:00:01Z","type":"llm_response","session_id":"sess_123","response":"Hi!","completion_tokens":1}`,
		`[2025-10-31 10:00:02] DEBUG System info`, // Should be skipped
		`{"timestamp":"2025-10-31T10:00:03Z","type":"tool_use","tool":"search"}`,
	}

	content := ""
	for _, line := range logLines {
		content += line + "\n"
	}

	err := os.WriteFile(testFile, []byte(content), 0644)
	require.NoError(t, err)

	events, err := adapter.ParseLogFile(testFile)
	require.NoError(t, err)
	
	// Should have 3 events (debug line skipped)
	assert.GreaterOrEqual(t, len(events), 3, "Should extract at least 3 events")

	// Check for expected event types
	foundRequest := false
	foundResponse := false
	foundTool := false
	
	for _, event := range events {
		switch event.Type {
		case types.EventTypeLLMRequest:
			foundRequest = true
		case types.EventTypeLLMResponse:
			foundResponse = true
		case types.EventTypeToolUse:
			foundTool = true
		}
	}

	assert.True(t, foundRequest, "Should have request event")
	assert.True(t, foundResponse, "Should have response event")
	assert.True(t, foundTool, "Should have tool use event")
}

func TestCursorAdapter_DetectEventType(t *testing.T) {
	adapter := NewCursorAdapter("test-project", nil, nil)

	tests := []struct {
		name     string
		entry    CursorLogEntry
		expected string
	}{
		{
			name:     "Explicit llm_request",
			entry:    CursorLogEntry{Type: "llm_request"},
			expected: types.EventTypeLLMRequest,
		},
		{
			name:     "Explicit completion",
			entry:    CursorLogEntry{Type: "completion"},
			expected: types.EventTypeLLMResponse,
		},
		{
			name:     "Infer from prompt",
			entry:    CursorLogEntry{Prompt: "Test prompt"},
			expected: types.EventTypeLLMRequest,
		},
		{
			name:     "Infer from response",
			entry:    CursorLogEntry{Response: "Test response"},
			expected: types.EventTypeLLMResponse,
		},
		{
			name:     "Infer from tool",
			entry:    CursorLogEntry{Tool: "search"},
			expected: types.EventTypeToolUse,
		},
		{
			name:     "File read",
			entry:    CursorLogEntry{File: "/test.go", Operation: "read"},
			expected: types.EventTypeFileRead,
		},
		{
			name:     "File write",
			entry:    CursorLogEntry{File: "/test.go", Operation: "write"},
			expected: types.EventTypeFileWrite,
		},
		{
			name:     "Unknown",
			entry:    CursorLogEntry{Message: "Generic message"},
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

func TestCursorAdapter_ParseTimestamp(t *testing.T) {
	adapter := NewCursorAdapter("test-project", nil, nil)

	tests := []struct {
		name    string
		input   interface{}
		checkFn func(*testing.T, time.Time)
	}{
		{
			name:  "RFC3339 string",
			input: "2025-10-31T10:00:00Z",
			checkFn: func(t *testing.T, ts time.Time) {
				assert.Equal(t, 2025, ts.Year())
			},
		},
		{
			name:  "Unix timestamp",
			input: int64(1730372400),
			checkFn: func(t *testing.T, ts time.Time) {
				assert.Equal(t, int64(1730372400), ts.Unix())
			},
		},
		{
			name:  "Nil timestamp",
			input: nil,
			checkFn: func(t *testing.T, ts time.Time) {
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

func TestCursorAdapter_SupportsFormat(t *testing.T) {
	adapter := NewCursorAdapter("test-project", nil, nil)

	tests := []struct {
		name   string
		sample string
		want   bool
	}{
		{
			name:   "JSON with session_id",
			sample: `{"session_id":"sess_123","message":"test"}`,
			want:   true,
		},
		{
			name:   "JSON with model",
			sample: `{"model":"gpt-4","message":"test"}`,
			want:   true,
		},
		{
			name:   "Plain text with cursor and ai",
			sample: "Cursor AI completion requested",
			want:   true,
		},
		{
			name:   "Invalid format",
			sample: "Generic log message",
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

func TestCursorAdapter_ExtractMetrics(t *testing.T) {
	adapter := NewCursorAdapter("test-project", nil, nil)

	tests := []struct {
		name     string
		entry    CursorLogEntry
		expected *types.EventMetrics
	}{
		{
			name: "With tokens",
			entry: CursorLogEntry{
				PromptTokens:     50,
				CompletionTokens: 100,
				Tokens:           150,
			},
			expected: &types.EventMetrics{
				PromptTokens:   50,
				ResponseTokens: 100,
				TokenCount:     150,
			},
		},
		{
			name:     "No tokens",
			entry:    CursorLogEntry{},
			expected: nil,
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

func TestCursorAdapter_GetSessionID(t *testing.T) {
	adapter := NewCursorAdapter("test-project", nil, nil)

	tests := []struct {
		name     string
		entry    CursorLogEntry
		wantType string // "specific" or "generated"
	}{
		{
			name:     "With session_id",
			entry:    CursorLogEntry{SessionID: "sess_123"},
			wantType: "specific",
		},
		{
			name:     "With conversation_id",
			entry:    CursorLogEntry{ConversationID: "conv_456"},
			wantType: "specific",
		},
		{
			name:     "No ID (generates UUID)",
			entry:    CursorLogEntry{},
			wantType: "generated",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := adapter.getSessionID(&tt.entry)
			assert.NotEmpty(t, result, "Session ID should not be empty")
			
			if tt.wantType == "specific" {
				if tt.entry.SessionID != "" {
					assert.Equal(t, tt.entry.SessionID, result)
				} else if tt.entry.ConversationID != "" {
					assert.Equal(t, tt.entry.ConversationID, result)
				}
			} else {
				// Should be a valid UUID format
				assert.Len(t, result, 36, "Generated UUID should be 36 chars")
			}
		})
	}
}
