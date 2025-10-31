package types

import "time"

// AgentEvent represents a standardized AI agent event
type AgentEvent struct {
	ID        string                 `json:"id"`
	Timestamp time.Time              `json:"timestamp"`
	Type      string                 `json:"type"`
	AgentID   string                 `json:"agentId"`
	SessionID string                 `json:"sessionId"` // Chat session UUID
	
	// Hierarchy context (resolved from workspace)
	ProjectID   int `json:"projectId,omitempty"`   // Resolved project ID
	MachineID   int `json:"machineId,omitempty"`   // Current machine ID
	WorkspaceID int `json:"workspaceId,omitempty"` // VS Code workspace ID
	
	// Legacy field for backward compatibility (deprecated)
	LegacyProjectID string `json:"legacyProjectId,omitempty"`
	
	Context map[string]interface{} `json:"context,omitempty"`
	Data    map[string]interface{} `json:"data"`
	Metrics *EventMetrics          `json:"metrics,omitempty"`
}

// EventMetrics contains performance metrics for an event
type EventMetrics struct {
	TokenCount     int     `json:"tokenCount,omitempty"`
	DurationMs     int64   `json:"durationMs,omitempty"`
	PromptTokens   int     `json:"promptTokens,omitempty"`
	ResponseTokens int     `json:"responseTokens,omitempty"`
	Cost           float64 `json:"cost,omitempty"`
}

// SessionInfo contains information about an agent session
type SessionInfo struct {
	SessionID   string    `json:"sessionId"`
	AgentID     string    `json:"agentId"`
	StartTime   time.Time `json:"startTime"`
	ProjectPath string    `json:"projectPath,omitempty"`
	Branch      string    `json:"branch,omitempty"`
	Commit      string    `json:"commit,omitempty"`
}

// EventType constants
const (
	EventTypeLLMRequest      = "llm_request"
	EventTypeLLMResponse     = "llm_response"
	EventTypeToolUse         = "tool_use"
	EventTypeFileRead        = "file_read"
	EventTypeFileWrite       = "file_write"
	EventTypeFileModify      = "file_modify"
	EventTypeCommandExec     = "command_execution"
	EventTypeUserInteraction = "user_interaction"
	EventTypeError           = "error_encountered"
	EventTypeSessionStart    = "session_start"
	EventTypeSessionEnd      = "session_end"
)
