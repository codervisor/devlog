package adapters

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/codervisor/devlog/internal/hierarchy"
	"github.com/codervisor/devlog/pkg/types"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

// ClaudeAdapter parses Claude Desktop logs
type ClaudeAdapter struct {
	*BaseAdapter
	hierarchy *hierarchy.HierarchyCache
	log       *logrus.Logger
}

// NewClaudeAdapter creates a new Claude adapter
func NewClaudeAdapter(projectID string, hierarchyCache *hierarchy.HierarchyCache, log *logrus.Logger) *ClaudeAdapter {
	if log == nil {
		log = logrus.New()
	}
	return &ClaudeAdapter{
		BaseAdapter: NewBaseAdapter("claude", projectID),
		hierarchy:   hierarchyCache,
		log:         log,
	}
}

// ClaudeLogEntry represents a single log entry from Claude Desktop
// Based on typical Claude/Anthropic log format (JSON lines)
type ClaudeLogEntry struct {
	Timestamp   interface{}            `json:"timestamp"` // Can be string or number
	Level       string                 `json:"level"`
	Message     string                 `json:"message"`
	Type        string                 `json:"type,omitempty"`
	ConversationID string              `json:"conversation_id,omitempty"`
	Model       string                 `json:"model,omitempty"`
	Prompt      string                 `json:"prompt,omitempty"`
	Response    string                 `json:"response,omitempty"`
	TokensUsed  int                    `json:"tokens_used,omitempty"`
	PromptTokens int                   `json:"prompt_tokens,omitempty"`
	ResponseTokens int                 `json:"response_tokens,omitempty"`
	ToolName    string                 `json:"tool_name,omitempty"`
	ToolInput   interface{}            `json:"tool_input,omitempty"`
	ToolOutput  interface{}            `json:"tool_output,omitempty"`
	FilePath    string                 `json:"file_path,omitempty"`
	Action      string                 `json:"action,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// ParseLogLine parses a single log line from Claude Desktop
func (a *ClaudeAdapter) ParseLogLine(line string) (*types.AgentEvent, error) {
	line = strings.TrimSpace(line)
	if line == "" {
		return nil, nil
	}

	var entry ClaudeLogEntry
	if err := json.Unmarshal([]byte(line), &entry); err != nil {
		// Not JSON, skip
		return nil, nil
	}

	// Detect event type and create appropriate event
	eventType := a.detectEventType(&entry)
	if eventType == "" {
		return nil, nil // Unknown event type, skip
	}

	timestamp := a.parseTimestamp(entry.Timestamp)
	event := &types.AgentEvent{
		ID:              uuid.New().String(),
		Timestamp:       timestamp,
		Type:            eventType,
		AgentID:         a.name,
		SessionID:       entry.ConversationID,
		LegacyProjectID: a.projectID,
		Context:         a.extractContext(&entry),
		Data:            a.extractData(&entry, eventType),
		Metrics:         a.extractMetrics(&entry),
	}

	return event, nil
}

// ParseLogFile parses a Claude Desktop log file (JSONL format)
func (a *ClaudeAdapter) ParseLogFile(filePath string) ([]*types.AgentEvent, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open log file: %w", err)
	}
	defer file.Close()

	// Try to resolve hierarchy context from file path
	// Claude logs might be in a project-specific directory
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
	
	// Increase buffer size for large log lines
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

// detectEventType determines the event type from a log entry
func (a *ClaudeAdapter) detectEventType(entry *ClaudeLogEntry) string {
	// Check explicit type field first
	switch entry.Type {
	case "llm_request", "prompt":
		return types.EventTypeLLMRequest
	case "llm_response", "completion":
		return types.EventTypeLLMResponse
	case "tool_use", "tool_call":
		return types.EventTypeToolUse
	case "file_read":
		return types.EventTypeFileRead
	case "file_write", "file_modify":
		return types.EventTypeFileWrite
	}

	// Infer from message content
	msgLower := strings.ToLower(entry.Message)
	
	if entry.Prompt != "" || strings.Contains(msgLower, "prompt") || strings.Contains(msgLower, "request") {
		return types.EventTypeLLMRequest
	}
	
	if entry.Response != "" || strings.Contains(msgLower, "response") || strings.Contains(msgLower, "completion") {
		return types.EventTypeLLMResponse
	}
	
	if entry.ToolName != "" || strings.Contains(msgLower, "tool") {
		return types.EventTypeToolUse
	}
	
	if entry.FilePath != "" {
		if entry.Action == "read" || strings.Contains(msgLower, "read") {
			return types.EventTypeFileRead
		}
		if entry.Action == "write" || strings.Contains(msgLower, "write") || strings.Contains(msgLower, "modify") {
			return types.EventTypeFileWrite
		}
	}

	return "" // Unknown type
}

// parseTimestamp handles various timestamp formats
func (a *ClaudeAdapter) parseTimestamp(ts interface{}) time.Time {
	switch v := ts.(type) {
	case string:
		// Try RFC3339 format
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			return t
		}
		// Try RFC3339Nano
		if t, err := time.Parse(time.RFC3339Nano, v); err == nil {
			return t
		}
		// Try ISO 8601
		if t, err := time.Parse("2006-01-02T15:04:05.000Z", v); err == nil {
			return t
		}
	case float64:
		// Unix timestamp in seconds
		return time.Unix(int64(v), 0)
	case int64:
		// Unix timestamp in seconds
		return time.Unix(v, 0)
	}
	// Fallback to now
	return time.Now()
}

// extractContext extracts context information from a log entry
func (a *ClaudeAdapter) extractContext(entry *ClaudeLogEntry) map[string]interface{} {
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

// extractData extracts event-specific data from a log entry
func (a *ClaudeAdapter) extractData(entry *ClaudeLogEntry, eventType string) map[string]interface{} {
	data := make(map[string]interface{})
	
	data["message"] = entry.Message
	
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
		if entry.ToolName != "" {
			data["toolName"] = entry.ToolName
		}
		if entry.ToolInput != nil {
			data["toolInput"] = entry.ToolInput
		}
		if entry.ToolOutput != nil {
			data["toolOutput"] = entry.ToolOutput
		}
	case types.EventTypeFileRead, types.EventTypeFileWrite:
		if entry.FilePath != "" {
			data["filePath"] = entry.FilePath
		}
		if entry.Action != "" {
			data["action"] = entry.Action
		}
	}
	
	if entry.ConversationID != "" {
		data["conversationId"] = entry.ConversationID
	}
	
	return data
}

// extractMetrics extracts metrics from a log entry
func (a *ClaudeAdapter) extractMetrics(entry *ClaudeLogEntry) *types.EventMetrics {
	if entry.TokensUsed == 0 && entry.PromptTokens == 0 && entry.ResponseTokens == 0 {
		return nil
	}
	
	return &types.EventMetrics{
		TokenCount:     entry.TokensUsed,
		PromptTokens:   entry.PromptTokens,
		ResponseTokens: entry.ResponseTokens,
	}
}

// SupportsFormat checks if this adapter can handle the given log format
func (a *ClaudeAdapter) SupportsFormat(sample string) bool {
	// Try to parse as JSON
	var entry ClaudeLogEntry
	if err := json.Unmarshal([]byte(sample), &entry); err != nil {
		return false
	}
	
	// Check for Claude-specific fields
	// Claude logs typically have conversation_id or specific message patterns
	return entry.ConversationID != "" || 
		entry.Model != "" ||
		strings.Contains(strings.ToLower(entry.Message), "claude") ||
		strings.Contains(strings.ToLower(entry.Message), "anthropic")
}
