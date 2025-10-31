package adapters

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/codervisor/devlog/collector/internal/hierarchy"
	"github.com/codervisor/devlog/collector/pkg/types"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

// CursorAdapter parses Cursor AI logs
// Cursor is based on VS Code, so it may use similar formats to Copilot
type CursorAdapter struct {
	*BaseAdapter
	hierarchy *hierarchy.HierarchyCache
	log       *logrus.Logger
}

// NewCursorAdapter creates a new Cursor adapter
func NewCursorAdapter(projectID string, hierarchyCache *hierarchy.HierarchyCache, log *logrus.Logger) *CursorAdapter {
	if log == nil {
		log = logrus.New()
	}
	return &CursorAdapter{
		BaseAdapter: NewBaseAdapter("cursor", projectID),
		hierarchy:   hierarchyCache,
		log:         log,
	}
}

// CursorLogEntry represents a log entry from Cursor
// Cursor may use structured JSON logs or plain text
type CursorLogEntry struct {
	Timestamp   interface{}            `json:"timestamp,omitempty"`
	Level       string                 `json:"level,omitempty"`
	Message     string                 `json:"message,omitempty"`
	Type        string                 `json:"type,omitempty"`
	SessionID   string                 `json:"session_id,omitempty"`
	ConversationID string              `json:"conversation_id,omitempty"`
	Model       string                 `json:"model,omitempty"`
	Prompt      string                 `json:"prompt,omitempty"`
	Response    string                 `json:"response,omitempty"`
	Tokens      int                    `json:"tokens,omitempty"`
	PromptTokens int                   `json:"prompt_tokens,omitempty"`
	CompletionTokens int               `json:"completion_tokens,omitempty"`
	Tool        string                 `json:"tool,omitempty"`
	ToolArgs    interface{}            `json:"tool_args,omitempty"`
	File        string                 `json:"file,omitempty"`
	Operation   string                 `json:"operation,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// ParseLogLine parses a single log line
func (a *CursorAdapter) ParseLogLine(line string) (*types.AgentEvent, error) {
	line = strings.TrimSpace(line)
	if line == "" {
		return nil, nil
	}

	// Try to parse as JSON first
	var entry CursorLogEntry
	if err := json.Unmarshal([]byte(line), &entry); err != nil {
		// Not JSON, try plain text parsing
		return a.parsePlainTextLine(line)
	}

	// Detect event type from JSON structure
	eventType := a.detectEventType(&entry)
	if eventType == "" {
		return nil, nil // Unknown event type
	}

	timestamp := a.parseTimestamp(entry.Timestamp)
	event := &types.AgentEvent{
		ID:              uuid.New().String(),
		Timestamp:       timestamp,
		Type:            eventType,
		AgentID:         a.name,
		SessionID:       a.getSessionID(&entry),
		LegacyProjectID: a.projectID,
		Context:         a.extractContext(&entry),
		Data:            a.extractData(&entry, eventType),
		Metrics:         a.extractMetrics(&entry),
	}

	return event, nil
}

// ParseLogFile parses a Cursor log file
func (a *CursorAdapter) ParseLogFile(filePath string) ([]*types.AgentEvent, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open log file: %w", err)
	}
	defer file.Close()

	// Try to resolve hierarchy context
	var hierarchyCtx *hierarchy.WorkspaceContext
	workspaceID := extractWorkspaceIDFromPath(filePath)
	if workspaceID != "" && a.hierarchy != nil {
		ctx, err := a.hierarchy.Resolve(workspaceID)
		if err != nil {
			a.log.Warnf("Failed to resolve workspace %s: %v - continuing without hierarchy", workspaceID, err)
		} else {
			hierarchyCtx = ctx
			a.log.Debugf("Resolved hierarchy for workspace %s: project=%d, machine=%d",
				workspaceID, ctx.ProjectID, ctx.MachineID)
		}
	}

	var events []*types.AgentEvent
	scanner := bufio.NewScanner(file)
	
	// Increase buffer for large lines
	buf := make([]byte, 0, 64*1024)
	scanner.Buffer(buf, 1024*1024)

	lineNum := 0
	for scanner.Scan() {
		lineNum++
		line := scanner.Text()
		
		event, err := a.ParseLogLine(line)
		if err != nil {
			a.log.Debugf("Failed to parse line %d: %v", lineNum, err)
			continue
		}
		
		if event != nil {
			// Add hierarchy context if available
			if hierarchyCtx != nil {
				event.ProjectID = hierarchyCtx.ProjectID
				event.MachineID = hierarchyCtx.MachineID
				event.WorkspaceID = hierarchyCtx.WorkspaceID
				event.Context["projectName"] = hierarchyCtx.ProjectName
				event.Context["machineName"] = hierarchyCtx.MachineName
			}
			events = append(events, event)
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading log file: %w", err)
	}

	return events, nil
}

// parsePlainTextLine attempts to parse plain text log lines
func (a *CursorAdapter) parsePlainTextLine(line string) (*types.AgentEvent, error) {
	// Basic pattern matching for common log patterns
	// Format: [timestamp] [level] message
	
	// Skip debug/info logs that aren't AI-related
	lower := strings.ToLower(line)
	if !strings.Contains(lower, "ai") && 
	   !strings.Contains(lower, "completion") && 
	   !strings.Contains(lower, "prompt") &&
	   !strings.Contains(lower, "tool") {
		return nil, nil
	}

	// Create a basic event from plain text
	event := &types.AgentEvent{
		ID:              uuid.New().String(),
		Timestamp:       time.Now(),
		Type:            types.EventTypeUserInteraction, // Default type
		AgentID:         a.name,
		SessionID:       uuid.New().String(),
		LegacyProjectID: a.projectID,
		Data: map[string]interface{}{
			"rawLog": line,
		},
	}

	return event, nil
}

// detectEventType determines event type from log entry
func (a *CursorAdapter) detectEventType(entry *CursorLogEntry) string {
	// Check explicit type field
	switch entry.Type {
	case "llm_request", "prompt", "completion_request":
		return types.EventTypeLLMRequest
	case "llm_response", "completion", "completion_response":
		return types.EventTypeLLMResponse
	case "tool_use", "tool_call":
		return types.EventTypeToolUse
	case "file_read":
		return types.EventTypeFileRead
	case "file_write", "file_modify":
		return types.EventTypeFileWrite
	}

	// Infer from content
	msgLower := strings.ToLower(entry.Message)
	
	if entry.Prompt != "" || strings.Contains(msgLower, "prompt") || strings.Contains(msgLower, "request") {
		return types.EventTypeLLMRequest
	}
	
	if entry.Response != "" || strings.Contains(msgLower, "response") || strings.Contains(msgLower, "completion") {
		return types.EventTypeLLMResponse
	}
	
	if entry.Tool != "" || strings.Contains(msgLower, "tool") {
		return types.EventTypeToolUse
	}
	
	if entry.File != "" {
		if entry.Operation == "read" || strings.Contains(msgLower, "read") {
			return types.EventTypeFileRead
		}
		if entry.Operation == "write" || strings.Contains(msgLower, "write") {
			return types.EventTypeFileWrite
		}
	}

	return ""
}

// getSessionID extracts session ID with fallback
func (a *CursorAdapter) getSessionID(entry *CursorLogEntry) string {
	if entry.SessionID != "" {
		return entry.SessionID
	}
	if entry.ConversationID != "" {
		return entry.ConversationID
	}
	return uuid.New().String()
}

// parseTimestamp handles various timestamp formats
func (a *CursorAdapter) parseTimestamp(ts interface{}) time.Time {
	if ts == nil {
		return time.Now()
	}

	switch v := ts.(type) {
	case string:
		// Try common formats
		formats := []string{
			time.RFC3339,
			time.RFC3339Nano,
			"2006-01-02T15:04:05.000Z",
			"2006-01-02 15:04:05",
		}
		for _, format := range formats {
			if t, err := time.Parse(format, v); err == nil {
				return t
			}
		}
	case float64:
		return time.Unix(int64(v), 0)
	case int64:
		return time.Unix(v, 0)
	}
	
	return time.Now()
}

// extractContext extracts context information
func (a *CursorAdapter) extractContext(entry *CursorLogEntry) map[string]interface{} {
	ctx := make(map[string]interface{})
	
	if entry.Level != "" {
		ctx["logLevel"] = entry.Level
	}
	
	if entry.Model != "" {
		ctx["model"] = entry.Model
	}
	
	if entry.Metadata != nil {
		for k, v := range entry.Metadata {
			ctx[k] = v
		}
	}
	
	return ctx
}

// extractData extracts event-specific data
func (a *CursorAdapter) extractData(entry *CursorLogEntry, eventType string) map[string]interface{} {
	data := make(map[string]interface{})
	
	if entry.Message != "" {
		data["message"] = entry.Message
	}
	
	switch eventType {
	case types.EventTypeLLMRequest:
		if entry.Prompt != "" {
			data["prompt"] = entry.Prompt
			data["promptLength"] = len(entry.Prompt)
		}
	case types.EventTypeLLMResponse:
		if entry.Response != "" {
			data["response"] = entry.Response
			data["responseLength"] = len(entry.Response)
		}
	case types.EventTypeToolUse:
		if entry.Tool != "" {
			data["toolName"] = entry.Tool
		}
		if entry.ToolArgs != nil {
			data["toolArgs"] = entry.ToolArgs
		}
	case types.EventTypeFileRead, types.EventTypeFileWrite:
		if entry.File != "" {
			data["filePath"] = entry.File
		}
		if entry.Operation != "" {
			data["operation"] = entry.Operation
		}
	}
	
	return data
}

// extractMetrics extracts metrics
func (a *CursorAdapter) extractMetrics(entry *CursorLogEntry) *types.EventMetrics {
	if entry.Tokens == 0 && entry.PromptTokens == 0 && entry.CompletionTokens == 0 {
		return nil
	}
	
	return &types.EventMetrics{
		TokenCount:     entry.Tokens,
		PromptTokens:   entry.PromptTokens,
		ResponseTokens: entry.CompletionTokens,
	}
}

// SupportsFormat checks if this adapter can handle the given log format
func (a *CursorAdapter) SupportsFormat(sample string) bool {
	// Try JSON parse
	var entry CursorLogEntry
	if err := json.Unmarshal([]byte(sample), &entry); err == nil {
		// Check for Cursor-specific markers
		return entry.SessionID != "" || 
			entry.ConversationID != "" ||
			strings.Contains(strings.ToLower(entry.Message), "cursor") ||
			entry.Model != ""
	}
	
	// Check plain text for Cursor markers
	lower := strings.ToLower(sample)
	return strings.Contains(lower, "cursor") && 
		(strings.Contains(lower, "ai") || strings.Contains(lower, "completion"))
}
