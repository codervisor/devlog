package adapters

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/codervisor/devlog/collector/internal/hierarchy"
	"github.com/codervisor/devlog/collector/pkg/types"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

// CopilotAdapter parses GitHub Copilot chat session logs
type CopilotAdapter struct {
	*BaseAdapter
	sessionID    string
	workspaceID  string // VS Code workspace ID from file path
	hierarchy    *hierarchy.HierarchyCache
	log          *logrus.Logger
	projectIDInt int // Parsed integer project ID
}

// NewCopilotAdapter creates a new Copilot adapter
func NewCopilotAdapter(projectID string, hierarchyCache *hierarchy.HierarchyCache, log *logrus.Logger) *CopilotAdapter {
	if log == nil {
		log = logrus.New()
	}
	// Parse projectID string to int
	projID, err := strconv.Atoi(projectID)
	if err != nil {
		log.Warnf("Failed to parse projectID '%s' as integer, defaulting to 1: %v", projectID, err)
		projID = 1
	}

	return &CopilotAdapter{
		BaseAdapter:  NewBaseAdapter("github-copilot", projectID),
		sessionID:    uuid.New().String(),
		hierarchy:    hierarchyCache,
		log:          log,
		projectIDInt: projID,
	}
}

// CopilotChatSession represents a Copilot chat session file
type CopilotChatSession struct {
	Version           int              `json:"version"`
	RequesterUsername string           `json:"requesterUsername"`
	ResponderUsername string           `json:"responderUsername"`
	InitialLocation   string           `json:"initialLocation"`
	Requests          []CopilotRequest `json:"requests"`
}

// CopilotRequest represents a single request-response turn in a chat session
type CopilotRequest struct {
	RequestID    string                `json:"requestId"`
	ResponseID   string                `json:"responseId"`
	Timestamp    interface{}           `json:"timestamp"` // Can be string or int64
	ModelID      string                `json:"modelId"`
	Message      CopilotMessage        `json:"message"`
	Response     []CopilotResponseItem `json:"response"`
	VariableData CopilotVariableData   `json:"variableData"`
	IsCanceled   bool                  `json:"isCanceled"`
}

// CopilotMessage represents a message (user or agent)
type CopilotMessage struct {
	Text  string               `json:"text"`
	Parts []CopilotMessagePart `json:"parts"`
}

// CopilotMessagePart represents a part of a message
type CopilotMessagePart struct {
	Text string `json:"text"`
	Kind string `json:"kind"`
}

// CopilotResponseItem represents an item in the agent's response stream
type CopilotResponseItem struct {
	Kind              *string                `json:"kind"`              // nullable
	Value             json.RawMessage        `json:"value,omitempty"`   // Can be string or array
	Content           *CopilotContent        `json:"content,omitempty"` // Nested content with value
	ToolID            string                 `json:"toolId,omitempty"`
	ToolName          string                 `json:"toolName,omitempty"`
	ToolCallID        string                 `json:"toolCallId,omitempty"`
	InvocationMessage json.RawMessage        `json:"invocationMessage,omitempty"` // Can be string or object
	PastTenseMessage  json.RawMessage        `json:"pastTenseMessage,omitempty"`  // Can be string or object
	IsComplete        bool                   `json:"isComplete,omitempty"`
	Source            *CopilotToolSource     `json:"source,omitempty"`
	URI               map[string]interface{} `json:"uri,omitempty"`
	Edits             []interface{}          `json:"edits,omitempty"`
}

// CopilotContent represents nested content with flexible value type
type CopilotContent struct {
	Value json.RawMessage        `json:"value,omitempty"` // Can be string or array
	URIs  map[string]interface{} `json:"uris,omitempty"`
}

// CopilotToolSource represents the source of a tool
type CopilotToolSource struct {
	Type  string `json:"type"`
	Label string `json:"label"`
}

// CopilotVariableData contains context variables for a request
type CopilotVariableData struct {
	Variables []CopilotVariable `json:"variables"`
}

// CopilotVariable represents a context variable (file, workspace info, etc)
type CopilotVariable struct {
	ID        string                 `json:"id"`
	Name      string                 `json:"name"`
	Value     map[string]interface{} `json:"value"`
	Kind      string                 `json:"kind"`
	IsRoot    bool                   `json:"isRoot"`
	AutoAdded bool                   `json:"automaticallyAdded"`
}

// ParseLogLine is deprecated - Copilot uses chat session files, not line-based logs
func (a *CopilotAdapter) ParseLogLine(line string) (*types.AgentEvent, error) {
	return nil, fmt.Errorf("line-based parsing not supported for Copilot chat sessions")
}

// ParseLogFile parses a Copilot chat session file
func (a *CopilotAdapter) ParseLogFile(filePath string) ([]*types.AgentEvent, error) {
	// Extract workspace ID from path first
	// Path format: .../workspaceStorage/{workspace-id}/chatSessions/{session-id}.json
	workspaceID := extractWorkspaceIDFromPath(filePath)

	// Resolve hierarchy context if workspace ID found and hierarchy cache available
	var hierarchyCtx *hierarchy.WorkspaceContext
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

	// Read the entire file
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read chat session file: %w", err)
	}

	// Parse as JSON
	var session CopilotChatSession
	if err := json.Unmarshal(data, &session); err != nil {
		return nil, fmt.Errorf("failed to parse chat session JSON: %w", err)
	}

	// Extract session ID from filename
	sessionID := extractSessionID(filePath)
	a.sessionID = sessionID

	// Extract workspace ID from file path
	a.workspaceID = extractWorkspaceIDFromPath(filePath)

	var events []*types.AgentEvent

	// Process each request in the session
	for i, request := range session.Requests {
		// Skip canceled requests
		if request.IsCanceled {
			continue
		}

		// Extract events from this request
		requestEvents, err := a.extractEventsFromRequest(&session, &request, i, hierarchyCtx)
		if err != nil {
			// Log error but continue processing
			continue
		}

		events = append(events, requestEvents...)
	}

	return events, nil
}

// extractSessionID extracts the session ID from the filename
func extractSessionID(filePath string) string {
	filename := filepath.Base(filePath)
	// Remove .json extension
	sessionID := strings.TrimSuffix(filename, ".json")
	return sessionID
}

// extractWorkspaceIDFromPath extracts the workspace ID from the file path
// Expected path format: .../workspaceStorage/{workspace-id}/chatSessions/{session-id}.json
func extractWorkspaceIDFromPath(filePath string) string {
	// Normalize path separators
	normalizedPath := filepath.ToSlash(filePath)

	// Look for workspaceStorage pattern
	parts := strings.Split(normalizedPath, "/")
	for i, part := range parts {
		if part == "workspaceStorage" && i+1 < len(parts) {
			return parts[i+1]
		}
	}

	return ""
}

// parseTimestamp handles both string and int64 timestamp formats
func parseTimestamp(ts interface{}) time.Time {
	switch v := ts.(type) {
	case string:
		// Try RFC3339 format
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			return t
		}
		// Try other common formats
		if t, err := time.Parse(time.RFC3339Nano, v); err == nil {
			return t
		}
	case float64:
		// Unix timestamp in milliseconds
		return time.Unix(0, int64(v)*int64(time.Millisecond))
	case int64:
		// Unix timestamp in milliseconds
		return time.Unix(0, v*int64(time.Millisecond))
	}
	// Fallback to now
	return time.Now()
}

// extractEventsFromRequest extracts all events from a single request-response turn
func (a *CopilotAdapter) extractEventsFromRequest(
	session *CopilotChatSession,
	request *CopilotRequest,
	requestIndex int,
	hierarchyCtx *hierarchy.WorkspaceContext,
) ([]*types.AgentEvent, error) {
	var events []*types.AgentEvent

	timestamp := parseTimestamp(request.Timestamp)

	// 1. Create LLM Request Event
	events = append(events, a.createLLMRequestEvent(session, request, timestamp, hierarchyCtx))

	// 2. Extract file reference events from variables
	for _, variable := range request.VariableData.Variables {
		if event := a.createFileReferenceEvent(request, &variable, timestamp, hierarchyCtx); event != nil {
			events = append(events, event)
		}
	}

	// 3. Extract tool invocations and collect response text
	toolEvents, responseText := a.extractToolAndResponseEvents(request, timestamp, hierarchyCtx)
	events = append(events, toolEvents...)

	// 4. Create LLM Response Event
	events = append(events, a.createLLMResponseEvent(request, responseText, timestamp, hierarchyCtx))

	return events, nil
}

// createLLMRequestEvent creates an event for the user's request
func (a *CopilotAdapter) createLLMRequestEvent(
	session *CopilotChatSession,
	request *CopilotRequest,
	timestamp time.Time,
	hierarchyCtx *hierarchy.WorkspaceContext,
) *types.AgentEvent {
	promptText := request.Message.Text
	promptLength := len(promptText)

	event := &types.AgentEvent{
		ID:              uuid.New().String(),
		Timestamp:       timestamp,
		Type:            types.EventTypeLLMRequest,
		AgentID:         a.name,
		AgentVersion:    "1.0.0",
		SessionID:       a.sessionID,
		ProjectID:       a.projectIDInt,
		LegacyProjectID: a.projectID, // Keep for backward compatibility
		Context: map[string]interface{}{
			"username":       session.RequesterUsername,
			"location":       session.InitialLocation,
			"variablesCount": len(request.VariableData.Variables),
			"workspaceId":    a.workspaceID,
			"workspacePath":  session.InitialLocation,
		},
		Data: map[string]interface{}{
			"requestId":    request.RequestID,
			"modelId":      request.ModelID,
			"prompt":       promptText,
			"promptLength": promptLength,
		},
		Metrics: &types.EventMetrics{
			PromptTokens: estimateTokens(promptText),
		},
	}

	// Add hierarchy context if available
	if hierarchyCtx != nil && hierarchyCtx.ProjectID > 0 {
		event.ProjectID = hierarchyCtx.ProjectID
		event.MachineID = hierarchyCtx.MachineID
		event.WorkspaceID = hierarchyCtx.WorkspaceID
		event.Context["projectName"] = hierarchyCtx.ProjectName
		event.Context["machineName"] = hierarchyCtx.MachineName
	}

	return event
}

// createLLMResponseEvent creates an event for the agent's response
func (a *CopilotAdapter) createLLMResponseEvent(
	request *CopilotRequest,
	responseText string,
	timestamp time.Time,
	hierarchyCtx *hierarchy.WorkspaceContext,
) *types.AgentEvent {
	responseLength := len(responseText)

	event := &types.AgentEvent{
		ID:              uuid.New().String(),
		Timestamp:       timestamp.Add(time.Second), // Slightly after request
		Type:            types.EventTypeLLMResponse,
		AgentID:         a.name,
		AgentVersion:    "1.0.0",
		SessionID:       a.sessionID,
		ProjectID:       a.projectIDInt,
		LegacyProjectID: a.projectID,
		Data: map[string]interface{}{
			"requestId":      request.RequestID,
			"responseId":     request.ResponseID,
			"response":       responseText,
			"responseLength": responseLength,
		},
		Metrics: &types.EventMetrics{
			ResponseTokens: estimateTokens(responseText),
		},
	}

	// Add hierarchy context if available
	if hierarchyCtx != nil && hierarchyCtx.ProjectID > 0 {
		event.ProjectID = hierarchyCtx.ProjectID
		event.MachineID = hierarchyCtx.MachineID
		event.WorkspaceID = hierarchyCtx.WorkspaceID
	}

	return event
}

// createFileReferenceEvent creates an event for a file reference from variables
func (a *CopilotAdapter) createFileReferenceEvent(
	request *CopilotRequest,
	variable *CopilotVariable,
	timestamp time.Time,
	hierarchyCtx *hierarchy.WorkspaceContext,
) *types.AgentEvent {
	// Extract file path from variable value
	filePath := extractFilePath(variable.Value)
	if filePath == "" {
		return nil
	}

	event := &types.AgentEvent{
		ID:              uuid.New().String(),
		Timestamp:       timestamp,
		Type:            types.EventTypeFileRead,
		AgentID:         a.name,
		AgentVersion:    "1.0.0",
		SessionID:       a.sessionID,
		ProjectID:       a.projectIDInt,
		LegacyProjectID: a.projectID,
		Data: map[string]interface{}{
			"requestId":    request.RequestID,
			"filePath":     filePath,
			"variableId":   variable.ID,
			"variableName": variable.Name,
			"kind":         variable.Kind,
			"automatic":    variable.AutoAdded,
		},
	}

	// Add hierarchy context if available
	if hierarchyCtx != nil && hierarchyCtx.ProjectID > 0 {
		event.ProjectID = hierarchyCtx.ProjectID
		event.MachineID = hierarchyCtx.MachineID
		event.WorkspaceID = hierarchyCtx.WorkspaceID
	}

	return event
}

// extractToolAndResponseEvents extracts tool invocation events and concatenates response text
func (a *CopilotAdapter) extractToolAndResponseEvents(
	request *CopilotRequest,
	timestamp time.Time,
	hierarchyCtx *hierarchy.WorkspaceContext,
) ([]*types.AgentEvent, string) {
	var events []*types.AgentEvent
	var responseTextParts []string
	timeOffset := time.Duration(0)

	for _, item := range request.Response {
		// Handle different response item kinds
		if item.Kind == nil {
			// Plain text response - extract value flexibly
			if valueText := extractValueAsString(item.Value); valueText != "" {
				responseTextParts = append(responseTextParts, valueText)
			}
		} else if *item.Kind == "toolInvocationSerialized" {
			// Tool invocation
			timeOffset += 100 * time.Millisecond
			event := a.createToolInvocationEvent(request, &item, timestamp.Add(timeOffset), hierarchyCtx)
			events = append(events, event)
		} else if *item.Kind == "codeblockUri" {
			// File reference from codeblock
			filePath := extractFilePath(item.URI)
			if filePath != "" {
				timeOffset += 50 * time.Millisecond
				event := &types.AgentEvent{
					ID:              uuid.New().String(),
					Timestamp:       timestamp.Add(timeOffset),
					Type:            types.EventTypeFileRead,
					AgentID:         a.name,
					AgentVersion:    "1.0.0",
					SessionID:       a.sessionID,
					ProjectID:       a.projectIDInt,
					LegacyProjectID: a.projectID,
					Data: map[string]interface{}{
						"requestId": request.RequestID,
						"filePath":  filePath,
						"source":    "codeblock",
					},
				}
				// Add hierarchy context if available
				if hierarchyCtx != nil && hierarchyCtx.ProjectID > 0 {
					event.ProjectID = hierarchyCtx.ProjectID
					event.MachineID = hierarchyCtx.MachineID
					event.WorkspaceID = hierarchyCtx.WorkspaceID
				}
				events = append(events, event)
			}
		} else if *item.Kind == "textEditGroup" {
			// File modifications
			timeOffset += 100 * time.Millisecond
			event := &types.AgentEvent{
				ID:              uuid.New().String(),
				Timestamp:       timestamp.Add(timeOffset),
				Type:            types.EventTypeFileModify,
				AgentID:         a.name,
				AgentVersion:    "1.0.0",
				SessionID:       a.sessionID,
				ProjectID:       a.projectIDInt,
				LegacyProjectID: a.projectID,
				Data: map[string]interface{}{
					"requestId": request.RequestID,
					"editCount": len(item.Edits),
				},
			}
			// Add hierarchy context if available
			if hierarchyCtx != nil && hierarchyCtx.ProjectID > 0 {
				event.ProjectID = hierarchyCtx.ProjectID
				event.MachineID = hierarchyCtx.MachineID
				event.WorkspaceID = hierarchyCtx.WorkspaceID
			}
			events = append(events, event)
		}
	}

	responseText := strings.Join(responseTextParts, "")
	return events, responseText
}

// createToolInvocationEvent creates an event for a tool invocation
func (a *CopilotAdapter) createToolInvocationEvent(
	request *CopilotRequest,
	item *CopilotResponseItem,
	timestamp time.Time,
	hierarchyCtx *hierarchy.WorkspaceContext,
) *types.AgentEvent {
	data := map[string]interface{}{
		"requestId":  request.RequestID,
		"toolId":     item.ToolID,
		"toolName":   item.ToolName,
		"toolCallId": item.ToolCallID,
		"isComplete": item.IsComplete,
	}

	// Extract invocation message (can be string or object)
	if len(item.InvocationMessage) > 0 {
		data["invocationMessage"] = extractMessageText(item.InvocationMessage)
	}

	// Extract result message (can be string or object)
	if len(item.PastTenseMessage) > 0 {
		data["result"] = extractMessageText(item.PastTenseMessage)
	}

	if item.Source != nil {
		data["source"] = item.Source.Label
	}

	event := &types.AgentEvent{
		ID:              uuid.New().String(),
		Timestamp:       timestamp,
		Type:            types.EventTypeToolUse,
		AgentID:         a.name,
		AgentVersion:    "1.0.0",
		SessionID:       a.sessionID,
		ProjectID:       a.projectIDInt,
		LegacyProjectID: a.projectID,
		Data:            data,
	}

	// Add hierarchy context if available
	if hierarchyCtx != nil && hierarchyCtx.ProjectID > 0 {
		event.ProjectID = hierarchyCtx.ProjectID
		event.MachineID = hierarchyCtx.MachineID
		event.WorkspaceID = hierarchyCtx.WorkspaceID
	}

	return event
}

// extractMessageText extracts text from a message that can be either a string or an object
func extractMessageText(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}

	// Try as string first
	var str string
	if err := json.Unmarshal(raw, &str); err == nil {
		return str
	}

	// Try as CopilotMessage object
	var msg CopilotMessage
	if err := json.Unmarshal(raw, &msg); err == nil {
		return msg.Text
	}

	// Fallback: return as-is (for debugging)
	return string(raw)
}

// extractFilePath extracts a file path from a VS Code URI object
func extractFilePath(uri map[string]interface{}) string {
	if uri == nil {
		return ""
	}

	// Look for path field
	if path, ok := uri["path"].(string); ok {
		return path
	}

	// Look for fsPath field
	if fsPath, ok := uri["fsPath"].(string); ok {
		return fsPath
	}

	return ""
}

// extractValueAsString extracts text from a value that can be string, array, or other types
func extractValueAsString(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}

	// Try as string first (most common)
	var str string
	if err := json.Unmarshal(raw, &str); err == nil {
		return str
	}

	// Try as array of strings
	var arrStr []string
	if err := json.Unmarshal(raw, &arrStr); err == nil {
		// Join array elements with newlines
		return strings.Join(arrStr, "\n")
	}

	// Try as array of interfaces (mixed types)
	var arrInterface []interface{}
	if err := json.Unmarshal(raw, &arrInterface); err == nil {
		// Convert each element to string
		var parts []string
		for _, elem := range arrInterface {
			if s, ok := elem.(string); ok {
				parts = append(parts, s)
			}
		}
		return strings.Join(parts, "\n")
	}

	// Fallback: return empty string for unparseable values (like empty arrays)
	return ""
}

// estimateTokens estimates token count from text (rough approximation)
func estimateTokens(text string) int {
	// Simple heuristic: ~1.3 tokens per word
	words := len(strings.Fields(text))
	return int(float64(words) * 1.3)
}

// SupportsFormat checks if this adapter can handle the given log format
func (a *CopilotAdapter) SupportsFormat(sample string) bool {
	// Try to parse as chat session JSON
	var session CopilotChatSession
	if err := json.Unmarshal([]byte(sample), &session); err != nil {
		return false
	}

	// Check for Copilot chat session structure
	return session.Version > 0 && len(session.Requests) > 0
}

// SetSessionID updates the session ID (useful when starting a new session)
func (a *CopilotAdapter) SetSessionID(sessionID string) {
	a.sessionID = sessionID
}
