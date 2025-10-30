package adapters

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/codervisor/devlog/collector/pkg/types"
	"github.com/google/uuid"
)

// CopilotAdapter parses GitHub Copilot logs
type CopilotAdapter struct {
	*BaseAdapter
	sessionID string
}

// NewCopilotAdapter creates a new Copilot adapter
func NewCopilotAdapter(projectID string) *CopilotAdapter {
	return &CopilotAdapter{
		BaseAdapter: NewBaseAdapter("github-copilot", projectID),
		sessionID:   uuid.New().String(),
	}
}

// CopilotLogEntry represents the structure of Copilot log entries
type CopilotLogEntry struct {
	Timestamp     string                 `json:"timestamp"`
	Level         string                 `json:"level"`
	Message       string                 `json:"message"`
	Source        string                 `json:"source"`
	RequestID     string                 `json:"requestId"`
	Model         string                 `json:"model"`
	Prompt        string                 `json:"prompt"`
	Completion    string                 `json:"completion"`
	PromptLen     int                    `json:"promptLen"`
	CompletionLen int                    `json:"completionLen"`
	TokensUsed    int                    `json:"tokensUsed"`
	DurationMs    int64                  `json:"durationMs"`
	FilePath      string                 `json:"filePath"`
	Language      string                 `json:"language"`
	Extra         map[string]interface{} `json:"-"`
}

// ParseLogLine parses a single Copilot log line
func (a *CopilotAdapter) ParseLogLine(line string) (*types.AgentEvent, error) {
	line = strings.TrimSpace(line)
	if line == "" {
		return nil, nil
	}

	// Copilot logs are typically JSON
	var logEntry CopilotLogEntry
	if err := json.Unmarshal([]byte(line), &logEntry); err != nil {
		// Not a valid JSON log line, skip it
		return nil, nil
	}

	// Only process completion events
	if !strings.Contains(logEntry.Message, "completion") &&
		!strings.Contains(logEntry.Message, "suggest") {
		return nil, nil
	}

	// Parse timestamp
	timestamp, err := time.Parse(time.RFC3339, logEntry.Timestamp)
	if err != nil {
		timestamp = time.Now()
	}

	// Determine event type
	eventType := types.EventTypeLLMRequest
	if logEntry.Completion != "" {
		eventType = types.EventTypeLLMResponse
	}

	// Build context
	context := map[string]interface{}{
		"source":  logEntry.Source,
		"level":   logEntry.Level,
		"message": logEntry.Message,
	}
	if logEntry.Model != "" {
		context["model"] = logEntry.Model
	}
	if logEntry.Language != "" {
		context["language"] = logEntry.Language
	}

	// Build data
	data := map[string]interface{}{
		"requestId": logEntry.RequestID,
	}
	if logEntry.FilePath != "" {
		data["filePath"] = logEntry.FilePath
	}
	if logEntry.Prompt != "" {
		data["prompt"] = logEntry.Prompt
		data["promptLength"] = logEntry.PromptLen
	}
	if logEntry.Completion != "" {
		data["completion"] = logEntry.Completion
		data["completionLength"] = logEntry.CompletionLen
	}

	// Build metrics
	var metrics *types.EventMetrics
	if logEntry.TokensUsed > 0 || logEntry.DurationMs > 0 {
		metrics = &types.EventMetrics{
			TokenCount:     logEntry.TokensUsed,
			DurationMs:     logEntry.DurationMs,
			PromptTokens:   logEntry.PromptLen,
			ResponseTokens: logEntry.CompletionLen,
		}
	}

	// Create event
	event := &types.AgentEvent{
		ID:        uuid.New().String(),
		Timestamp: timestamp,
		Type:      eventType,
		AgentID:   a.name,
		SessionID: a.sessionID,
		ProjectID: a.projectID,
		Context:   context,
		Data:      data,
		Metrics:   metrics,
	}

	return event, nil
}

// ParseLogFile parses an entire Copilot log file
func (a *CopilotAdapter) ParseLogFile(filePath string) ([]*types.AgentEvent, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open log file: %w", err)
	}
	defer file.Close()

	var events []*types.AgentEvent
	scanner := bufio.NewScanner(file)

	// Increase buffer size for large log lines
	const maxCapacity = 512 * 1024 // 512KB
	buf := make([]byte, maxCapacity)
	scanner.Buffer(buf, maxCapacity)

	lineNum := 0
	for scanner.Scan() {
		lineNum++
		line := scanner.Text()

		event, err := a.ParseLogLine(line)
		if err != nil {
			// Log error but continue processing
			continue
		}

		if event != nil {
			events = append(events, event)
		}
	}

	if err := scanner.Err(); err != nil {
		return events, fmt.Errorf("error reading log file: %w", err)
	}

	return events, nil
}

// SupportsFormat checks if this adapter can handle the given log format
func (a *CopilotAdapter) SupportsFormat(sample string) bool {
	// Check if it looks like Copilot JSON logs
	var logEntry CopilotLogEntry
	if err := json.Unmarshal([]byte(sample), &logEntry); err != nil {
		return false
	}

	// Look for Copilot-specific fields
	return logEntry.Source != "" ||
		strings.Contains(sample, "copilot") ||
		strings.Contains(sample, "github.copilot")
}

// SetSessionID updates the session ID (useful when starting a new session)
func (a *CopilotAdapter) SetSessionID(sessionID string) {
	a.sessionID = sessionID
}
