package adapters

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/codervisor/devlog/collector/pkg/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCopilotAdapter_ParseLogFile(t *testing.T) {
	// Create test chat session file
	testSession := CopilotChatSession{
		Version:           3,
		RequesterUsername: "testuser",
		ResponderUsername: "GitHub Copilot",
		InitialLocation:   "panel",
		Requests: []CopilotRequest{
			{
				RequestID:  "request_123",
				ResponseID: "response_123",
				Timestamp:  int64(1730372400000), // Oct 31, 2025 in milliseconds
				ModelID:    "copilot/claude-sonnet-4.5",
				Message: CopilotMessage{
					Text: "Help me fix this bug",
					Parts: []CopilotMessagePart{
						{Text: "Help me fix this bug", Kind: "text"},
					},
				},
				Response: []CopilotResponseItem{
					{
						Kind:  nil,
						Value: json.RawMessage(`"I'll help you fix the bug. Let me search for the issue."`),
					},
					{
						Kind:              strPtr("toolInvocationSerialized"),
						ToolID:            "copilot_findTextInFiles",
						ToolName:          "findTextInFiles",
						ToolCallID:        "tool_456",
						InvocationMessage: json.RawMessage(`{"text":"Searching for bug pattern"}`),
						PastTenseMessage:  json.RawMessage(`{"text":"Found 3 matches"}`),
						IsComplete:        true,
						Source: &CopilotToolSource{
							Type:  "internal",
							Label: "Built-In",
						},
					},
					{
						Kind:  nil,
						Value: json.RawMessage(`"Here's the fix you need."`),
					},
				},
				VariableData: CopilotVariableData{
					Variables: []CopilotVariable{
						{
							ID:   "var_1",
							Name: "test.go",
							Value: map[string]interface{}{
								"path": "/workspace/test.go",
							},
							Kind:      "file",
							IsRoot:    false,
							AutoAdded: true,
						},
					},
				},
				IsCanceled: false,
			},
		},
	}

	// Write test file
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "test-session.json")
	data, err := json.Marshal(testSession)
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(testFile, data, 0644))

	// Parse the file (without hierarchy - testing graceful degradation)
	adapter := NewCopilotAdapter("test-project", nil, nil)
	events, err := adapter.ParseLogFile(testFile)

	// Assertions
	require.NoError(t, err)
	require.NotEmpty(t, events)

	// Should have multiple events: request, file reference, tool use, response
	assert.GreaterOrEqual(t, len(events), 4, "Should extract multiple events")

	// Check event types
	eventTypes := make(map[string]int)
	for _, event := range events {
		eventTypes[event.Type]++
	}

	assert.Greater(t, eventTypes[types.EventTypeLLMRequest], 0, "Should have request event")
	assert.Greater(t, eventTypes[types.EventTypeLLMResponse], 0, "Should have response event")
	assert.Greater(t, eventTypes[types.EventTypeToolUse], 0, "Should have tool use event")
	assert.Greater(t, eventTypes[types.EventTypeFileRead], 0, "Should have file read event")
}

func TestCopilotAdapter_ParseLogFile_RealSample(t *testing.T) {
	// Test with real sample if available
	samplePath := "/Users/marvzhang/projects/codervisor/devlog/tmp/copilot-samples/sample-1.json"
	if _, err := os.Stat(samplePath); os.IsNotExist(err) {
		t.Skip("Real sample file not available")
	}

	adapter := NewCopilotAdapter("test-project", nil, nil)
	events, err := adapter.ParseLogFile(samplePath)

	require.NoError(t, err)
	require.NotEmpty(t, events, "Should extract events from real sample")

	t.Logf("Extracted %d events from real sample", len(events))

	// Log event types for debugging
	eventTypes := make(map[string]int)
	for _, event := range events {
		eventTypes[event.Type]++
	}
	t.Logf("Event types: %+v", eventTypes)

	// Verify we have diverse event types
	assert.Greater(t, len(eventTypes), 1, "Should have multiple event types")
	assert.Greater(t, eventTypes[types.EventTypeLLMRequest], 0, "Should have request events")
	assert.Greater(t, eventTypes[types.EventTypeLLMResponse], 0, "Should have response events")
}

func TestCopilotAdapter_ParseTimestamp(t *testing.T) {
	tests := []struct {
		name     string
		input    interface{}
		wantZero bool
	}{
		{
			name:     "Unix milliseconds (int64)",
			input:    int64(1730372400000),
			wantZero: false,
		},
		{
			name:     "Unix milliseconds (float64)",
			input:    float64(1730372400000),
			wantZero: false,
		},
		{
			name:     "RFC3339 string",
			input:    "2025-10-31T10:00:00Z",
			wantZero: false,
		},
		{
			name:     "Invalid input",
			input:    "invalid",
			wantZero: false, // Should fallback to time.Now()
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseTimestamp(tt.input)
			if tt.wantZero {
				assert.True(t, result.IsZero())
			} else {
				assert.False(t, result.IsZero())
			}
		})
	}
}

func TestCopilotAdapter_ExtractFilePath(t *testing.T) {
	tests := []struct {
		name string
		uri  map[string]interface{}
		want string
	}{
		{
			name: "Path field",
			uri: map[string]interface{}{
				"path": "/workspace/test.go",
			},
			want: "/workspace/test.go",
		},
		{
			name: "FsPath field",
			uri: map[string]interface{}{
				"fsPath": "/workspace/test.ts",
			},
			want: "/workspace/test.ts",
		},
		{
			name: "Empty URI",
			uri:  map[string]interface{}{},
			want: "",
		},
		{
			name: "Nil URI",
			uri:  nil,
			want: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractFilePath(tt.uri)
			assert.Equal(t, tt.want, result)
		})
	}
}

func TestCopilotAdapter_EstimateTokens(t *testing.T) {
	tests := []struct {
		name string
		text string
		want int
	}{
		{
			name: "Empty text",
			text: "",
			want: 0,
		},
		{
			name: "Single word",
			text: "hello",
			want: 1, // 1 word * 1.3 = 1
		},
		{
			name: "Multiple words",
			text: "hello world foo bar",
			want: 5, // 4 words * 1.3 = 5
		},
		{
			name: "Long text",
			text: "This is a longer piece of text with many words that should be estimated correctly",
			want: 18, // 15 words * 1.3 = 19 (rounded down)
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := estimateTokens(tt.text)
			// Allow some margin due to rounding
			assert.InDelta(t, tt.want, result, 2)
		})
	}
}

func TestCopilotAdapter_SupportsFormat(t *testing.T) {
	adapter := NewCopilotAdapter("test-project", nil, nil)

	tests := []struct {
		name   string
		sample string
		want   bool
	}{
		{
			name: "Valid chat session",
			sample: `{
				"version": 3,
				"requesterUsername": "testuser",
				"requests": [{"requestId": "123"}]
			}`,
			want: true,
		},
		{
			name:   "Invalid JSON",
			sample: "not json",
			want:   false,
		},
		{
			name:   "Empty object",
			sample: "{}",
			want:   false,
		},
		{
			name: "Missing requests",
			sample: `{
				"version": 3,
				"requesterUsername": "testuser"
			}`,
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := adapter.SupportsFormat(tt.sample)
			assert.Equal(t, tt.want, result)
		})
	}
}

func TestCopilotAdapter_ExtractSessionID(t *testing.T) {
	tests := []struct {
		name     string
		filePath string
		want     string
	}{
		{
			name:     "UUID filename",
			filePath: "/path/to/3b36cddd-95cf-446f-9888-5165fac29787.json",
			want:     "3b36cddd-95cf-446f-9888-5165fac29787",
		},
		{
			name:     "Simple filename",
			filePath: "/path/to/session.json",
			want:     "session",
		},
		{
			name:     "No extension",
			filePath: "/path/to/session",
			want:     "session",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractSessionID(tt.filePath)
			assert.Equal(t, tt.want, result)
		})
	}
}

func TestCopilotAdapter_CreateLLMRequestEvent(t *testing.T) {
	adapter := NewCopilotAdapter("test-project", nil, nil)
	adapter.sessionID = "test-session"

	session := &CopilotChatSession{
		RequesterUsername: "testuser",
		InitialLocation:   "panel",
	}

	request := &CopilotRequest{
		RequestID: "req_123",
		ModelID:   "gpt-4",
		Message: CopilotMessage{
			Text: "Test prompt",
		},
		VariableData: CopilotVariableData{
			Variables: []CopilotVariable{{ID: "var1"}},
		},
	}

	timestamp := time.Now()
	event := adapter.createLLMRequestEvent(session, request, timestamp, nil)

	assert.NotNil(t, event)
	assert.Equal(t, types.EventTypeLLMRequest, event.Type)
	assert.Equal(t, "github-copilot", event.AgentID)
	assert.Equal(t, "test-session", event.SessionID)
	assert.Equal(t, "test-project", event.LegacyProjectID)
	assert.Equal(t, timestamp, event.Timestamp)

	// Check data fields
	assert.Equal(t, "req_123", event.Data["requestId"])
	assert.Equal(t, "gpt-4", event.Data["modelId"])
	assert.Equal(t, "Test prompt", event.Data["prompt"])
	assert.Equal(t, 11, event.Data["promptLength"])

	// Check context
	assert.Equal(t, "testuser", event.Context["username"])
	assert.Equal(t, "panel", event.Context["location"])
	assert.Equal(t, 1, event.Context["variablesCount"])

	// Check metrics
	assert.NotNil(t, event.Metrics)
	assert.Greater(t, event.Metrics.PromptTokens, 0)
}

func TestCopilotAdapter_SkipCanceledRequests(t *testing.T) {
	testSession := CopilotChatSession{
		Version:           3,
		RequesterUsername: "testuser",
		Requests: []CopilotRequest{
			{
				RequestID:  "req_1",
				Timestamp:  int64(1730372400000),
				Message:    CopilotMessage{Text: "First request"},
				Response:   []CopilotResponseItem{{Value: json.RawMessage(`"Response"`)}},
				IsCanceled: true, // Should be skipped
			},
			{
				RequestID:  "req_2",
				Timestamp:  int64(1730372401000),
				Message:    CopilotMessage{Text: "Second request"},
				Response:   []CopilotResponseItem{{Value: json.RawMessage(`"Response"`)}},
				IsCanceled: false, // Should be processed
			},
		},
	}

	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "test-canceled.json")
	data, err := json.Marshal(testSession)
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(testFile, data, 0644))

	adapter := NewCopilotAdapter("test-project", nil, nil)
	events, err := adapter.ParseLogFile(testFile)

	require.NoError(t, err)

	// Should only have events from the non-canceled request
	for _, event := range events {
		if requestID, ok := event.Data["requestId"].(string); ok {
			assert.NotEqual(t, "req_1", requestID, "Should not have events from canceled request")
		}
	}
}

// Helper function
func strPtr(s string) *string {
	return &s
}

func TestExtractWorkspaceIDFromPath(t *testing.T) {
	tests := []struct {
		name     string
		filePath string
		want     string
	}{
		{
			name:     "Standard VS Code path",
			filePath: "/Users/username/.vscode/extensions/workspaceStorage/abc123def456/chatSessions/session1.json",
			want:     "abc123def456",
		},
		{
			name:     "Windows path with forward slashes",
			filePath: "C:/Users/username/AppData/Roaming/Code/User/workspaceStorage/xyz789/chatSessions/session.json",
			want:     "xyz789",
		},
		{
			name:     "No workspaceStorage",
			filePath: "/some/other/path/session.json",
			want:     "",
		},
		{
			name:     "WorkspaceStorage at end",
			filePath: "/path/to/workspaceStorage",
			want:     "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractWorkspaceIDFromPath(tt.filePath)
			assert.Equal(t, tt.want, result)
		})
	}
}

func TestCopilotAdapter_ArrayValueSupport(t *testing.T) {
	// Test with file containing array values
	testFile := "testdata/copilot-array-value.json"
	if _, err := os.Stat(testFile); os.IsNotExist(err) {
		t.Skip("Test file not available")
	}

	adapter := NewCopilotAdapter("test-project", nil, nil)
	events, err := adapter.ParseLogFile(testFile)

	require.NoError(t, err, "Should parse file with array values successfully")
	require.NotEmpty(t, events, "Should extract events from file with array values")

	t.Logf("Extracted %d events from array value test file", len(events))

	// Verify we have the expected event types
	eventTypes := make(map[string]int)
	for _, event := range events {
		eventTypes[event.Type]++
	}

	assert.Greater(t, eventTypes[types.EventTypeLLMRequest], 0, "Should have request event")
	assert.Greater(t, eventTypes[types.EventTypeLLMResponse], 0, "Should have response event")
}

func TestExtractValueAsString(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "String value",
			input: `"hello world"`,
			want:  "hello world",
		},
		{
			name:  "Empty string",
			input: `""`,
			want:  "",
		},
		{
			name:  "Array of strings",
			input: `["line1", "line2", "line3"]`,
			want:  "line1\nline2\nline3",
		},
		{
			name:  "Empty array",
			input: `[]`,
			want:  "",
		},
		{
			name:  "Array with single string",
			input: `["single"]`,
			want:  "single",
		},
		{
			name:  "Null value",
			input: `null`,
			want:  "",
		},
		{
			name:  "Empty input",
			input: ``,
			want:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractValueAsString(json.RawMessage(tt.input))
			assert.Equal(t, tt.want, result)
		})
	}
}

func TestCopilotAdapter_RealFileWithArrayValue(t *testing.T) {
	// Test with the actual problematic file if available
	realFile := "/Users/marvzhang/Library/Application Support/Code - Insiders/User/workspaceStorage/5987bb38e8bfe2022dbffb3d3bdd5fd7/chatSessions/571316aa-c122-405c-aac7-b02ea42d15e0.json"
	if _, err := os.Stat(realFile); os.IsNotExist(err) {
		t.Skip("Real problematic file not available")
	}

	adapter := NewCopilotAdapter("test-project", nil, nil)
	events, err := adapter.ParseLogFile(realFile)

	require.NoError(t, err, "Should successfully parse the previously failing file")
	require.NotEmpty(t, events, "Should extract events from previously failing file")

	t.Logf("Successfully extracted %d events from previously failing file", len(events))

	// Log event types for verification
	eventTypes := make(map[string]int)
	for _, event := range events {
		eventTypes[event.Type]++
	}
	t.Logf("Event types: %+v", eventTypes)

	assert.Greater(t, len(eventTypes), 1, "Should have multiple event types")
	assert.Greater(t, eventTypes[types.EventTypeLLMRequest], 0, "Should have request events")
	assert.Greater(t, eventTypes[types.EventTypeLLMResponse], 0, "Should have response events")
}
