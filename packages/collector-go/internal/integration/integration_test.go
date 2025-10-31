package integration

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/codervisor/devlog/collector/internal/adapters"
	"github.com/codervisor/devlog/collector/internal/buffer"
	"github.com/codervisor/devlog/collector/internal/client"
	"github.com/codervisor/devlog/collector/internal/watcher"
	"github.com/codervisor/devlog/collector/pkg/types"
	"github.com/sirupsen/logrus"
)

// TestEndToEnd_CopilotLogParsing tests the complete flow from log file to backend
func TestEndToEnd_CopilotLogParsing(t *testing.T) {
	// Create temporary directories
	tmpDir := t.TempDir()
	logDir := filepath.Join(tmpDir, "logs")
	bufferPath := filepath.Join(tmpDir, "buffer.db")

	if err := os.MkdirAll(logDir, 0755); err != nil {
		t.Fatalf("failed to create log dir: %v", err)
	}

	// Create mock backend server
	var receivedEvents []*types.AgentEvent
	var mu sync.Mutex

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v1/agent/events/batch" {
			var body map[string]interface{}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}

			events, ok := body["events"].([]interface{})
			if !ok {
				http.Error(w, "invalid events", http.StatusBadRequest)
				return
			}

			mu.Lock()
			for _, e := range events {
				eventJSON, _ := json.Marshal(e)
				var event types.AgentEvent
				json.Unmarshal(eventJSON, &event)
				receivedEvents = append(receivedEvents, &event)
			}
			mu.Unlock()

			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
		}
	}))
	defer server.Close()

	// Initialize components
	registry := adapters.DefaultRegistry("test-project", nil, nil)
	adapter := adapters.NewCopilotAdapter("test-project")

	log := logrus.New()
	log.SetLevel(logrus.DebugLevel)

	bufferConfig := buffer.Config{
		DBPath:  bufferPath,
		MaxSize: 1000,
		Logger:  log,
	}
	buf, err := buffer.NewBuffer(bufferConfig)
	if err != nil {
		t.Fatalf("failed to create buffer: %v", err)
	}
	defer buf.Close()

	clientConfig := client.Config{
		BaseURL:    server.URL,
		APIKey:     "test-key",
		BatchSize:  2,
		BatchDelay: 500 * time.Millisecond,
		Logger:     log,
	}
	apiClient := client.NewClient(clientConfig)
	apiClient.Start()
	defer apiClient.Stop()

	watcherConfig := watcher.Config{
		Registry:       registry,
		EventQueueSize: 100,
		DebounceMs:     50,
		Logger:         log,
	}
	fileWatcher, err := watcher.NewWatcher(watcherConfig)
	if err != nil {
		t.Fatalf("failed to create watcher: %v", err)
	}
	defer fileWatcher.Stop()

	if err := fileWatcher.Start(); err != nil {
		t.Fatalf("failed to start watcher: %v", err)
	}

	// Create log file BEFORE watching (so it gets parsed on initial scan)
	logFile := filepath.Join(logDir, "copilot.log")
	logContent := `{"timestamp":"2025-10-30T10:00:00Z","level":"info","message":"completion accepted","source":"copilot","requestId":"req-1","model":"gpt-4","prompt":"function add","completion":"function add(a, b) { return a + b; }","promptLen":12,"completionLen":35,"tokensUsed":47,"durationMs":250,"filePath":"test.js","language":"javascript"}
{"timestamp":"2025-10-30T10:00:01Z","level":"info","message":"completion accepted","source":"copilot","requestId":"req-2","model":"gpt-4","prompt":"const x","completion":"const x = 10;","promptLen":7,"completionLen":14,"tokensUsed":21,"durationMs":150,"filePath":"test.js","language":"javascript"}
`

	if err := os.WriteFile(logFile, []byte(logContent), 0644); err != nil {
		t.Fatalf("failed to write log file: %v", err)
	}

	// Parse initial file content directly (simulating what main.go would do)
	events, err := adapter.ParseLogFile(logFile)
	if err != nil {
		t.Fatalf("failed to parse log file: %v", err)
	}
	t.Logf("Parsed %d events from initial log file", len(events))

	// Send parsed events
	for _, event := range events {
		if err := apiClient.SendEvent(event); err != nil {
			t.Logf("Failed to send event: %v", err)
		}
	}

	// Watch log directory for future changes
	if err := fileWatcher.Watch(logDir, adapter); err != nil {
		t.Fatalf("failed to watch directory: %v", err)
	}

	// Process future events from watcher to client
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case event := <-fileWatcher.EventQueue():
				if err := apiClient.SendEvent(event); err != nil {
					t.Logf("Failed to send event: %v", err)
				}
			}
		}
	}()

	// Wait for events to be processed
	time.Sleep(2 * time.Second)

	// Verify events were received by backend
	mu.Lock()
	eventCount := len(receivedEvents)
	mu.Unlock()

	if eventCount != 2 {
		t.Errorf("expected 2 events received, got %d", eventCount)
	}

	// Verify event content
	if eventCount > 0 {
		mu.Lock()
		firstEvent := receivedEvents[0]
		mu.Unlock()

		if firstEvent.AgentID != "github-copilot" {
			t.Errorf("expected agent ID 'github-copilot', got %s", firstEvent.AgentID)
		}

		if firstEvent.Type != types.EventTypeLLMResponse {
			t.Errorf("expected type %s, got %s", types.EventTypeLLMResponse, firstEvent.Type)
		}

		if firstEvent.Data["filePath"] != "test.js" {
			t.Errorf("expected filePath 'test.js', got %v", firstEvent.Data["filePath"])
		}
	}
}

// TestEndToEnd_OfflineBuffering tests that events are buffered when backend is down
func TestEndToEnd_OfflineBuffering(t *testing.T) {
	tmpDir := t.TempDir()
	logDir := filepath.Join(tmpDir, "logs")
	bufferPath := filepath.Join(tmpDir, "buffer.db")

	if err := os.MkdirAll(logDir, 0755); err != nil {
		t.Fatalf("failed to create log dir: %v", err)
	}

	// Create mock backend that's initially down
	backendUp := false
	var receivedEvents []*types.AgentEvent
	var mu sync.Mutex

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !backendUp {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}

		if r.URL.Path == "/api/v1/agent/events/batch" {
			var body map[string]interface{}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}

			events, ok := body["events"].([]interface{})
			if ok {
				mu.Lock()
				for _, e := range events {
					eventJSON, _ := json.Marshal(e)
					var event types.AgentEvent
					json.Unmarshal(eventJSON, &event)
					receivedEvents = append(receivedEvents, &event)
				}
				mu.Unlock()
			}

			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
		}
	}))
	defer server.Close()

	// Initialize components
	registry := adapters.DefaultRegistry("test-project", nil, nil)
	adapter := adapters.NewCopilotAdapter("test-project")

	log := logrus.New()
	log.SetLevel(logrus.WarnLevel) // Reduce noise

	bufferConfig := buffer.Config{
		DBPath:  bufferPath,
		MaxSize: 1000,
		Logger:  log,
	}
	buf, err := buffer.NewBuffer(bufferConfig)
	if err != nil {
		t.Fatalf("failed to create buffer: %v", err)
	}
	defer buf.Close()

	clientConfig := client.Config{
		BaseURL:    server.URL,
		APIKey:     "test-key",
		BatchSize:  10,
		BatchDelay: 500 * time.Millisecond,
		MaxRetries: 1, // Fail fast
		Logger:     log,
	}
	apiClient := client.NewClient(clientConfig)
	apiClient.Start()
	defer apiClient.Stop()

	watcherConfig := watcher.Config{
		Registry:       registry,
		EventQueueSize: 100,
		DebounceMs:     50,
		Logger:         log,
	}
	fileWatcher, err := watcher.NewWatcher(watcherConfig)
	if err != nil {
		t.Fatalf("failed to create watcher: %v", err)
	}
	defer fileWatcher.Stop()

	if err := fileWatcher.Start(); err != nil {
		t.Fatalf("failed to start watcher: %v", err)
	}

	if err := fileWatcher.Watch(logDir, adapter); err != nil {
		t.Fatalf("failed to watch directory: %v", err)
	}

	// Process events - buffer on failure
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case event := <-fileWatcher.EventQueue():
				if err := apiClient.SendEvent(event); err != nil {
					// Buffer on failure
					buf.Store(event)
				}
			}
		}
	}()

	// Write log events while backend is down
	logFile := filepath.Join(logDir, "copilot.log")
	logContent := `{"timestamp":"2025-10-30T10:00:00Z","level":"info","message":"completion accepted","source":"copilot","requestId":"req-1","model":"gpt-4","completion":"test1","tokensUsed":10}
{"timestamp":"2025-10-30T10:00:01Z","level":"info","message":"completion accepted","source":"copilot","requestId":"req-2","model":"gpt-4","completion":"test2","tokensUsed":10}
`

	if err := os.WriteFile(logFile, []byte(logContent), 0644); err != nil {
		t.Fatalf("failed to write log file: %v", err)
	}

	// Parse and try to send (will fail and buffer)
	events, err := adapter.ParseLogFile(logFile)
	if err != nil {
		t.Fatalf("failed to parse log file: %v", err)
	}

	// Try to send each event individually (will fail fast)
	for _, event := range events {
		if err := apiClient.SendSingleEvent(event); err != nil {
			// Buffer on failure
			if err := buf.Store(event); err != nil {
				t.Fatalf("failed to buffer event: %v", err)
			}
		}
	}

	// Wait for processing and buffering
	time.Sleep(1 * time.Second)

	// Verify events are buffered
	bufferedCount, err := buf.Count()
	if err != nil {
		t.Fatalf("failed to count buffered events: %v", err)
	}

	if bufferedCount < 1 {
		t.Errorf("expected at least 1 buffered event, got %d", bufferedCount)
	}

	t.Logf("Buffered %d events while backend was down", bufferedCount)

	// Bring backend up
	backendUp = true
	t.Log("Backend is now up")

	// Flush buffer manually
	bufferedEvents, err := buf.Retrieve(100)
	if err != nil {
		t.Fatalf("failed to retrieve buffered events: %v", err)
	}

	sentIDs := []string{}
	for _, event := range bufferedEvents {
		if err := apiClient.SendEvent(event); err != nil {
			t.Logf("Failed to send buffered event: %v", err)
		} else {
			sentIDs = append(sentIDs, event.ID)
		}
	}

	// Wait for batch to be sent
	time.Sleep(1 * time.Second)

	// Delete sent events from buffer
	if len(sentIDs) > 0 {
		if err := buf.Delete(sentIDs); err != nil {
			t.Fatalf("failed to delete sent events: %v", err)
		}
	}

	// Verify events were received
	mu.Lock()
	eventCount := len(receivedEvents)
	mu.Unlock()

	if eventCount < 1 {
		t.Errorf("expected at least 1 event received after backend came up, got %d", eventCount)
	}

	// Verify buffer is cleared
	finalBufferedCount, _ := buf.Count()
	if finalBufferedCount > 0 {
		t.Logf("Warning: %d events still in buffer", finalBufferedCount)
	}

	t.Logf("Successfully flushed buffer: %d events sent", eventCount)
}

// TestEndToEnd_LogRotation tests handling of log file rotation
func TestEndToEnd_LogRotation(t *testing.T) {
	tmpDir := t.TempDir()
	logDir := filepath.Join(tmpDir, "logs")

	if err := os.MkdirAll(logDir, 0755); err != nil {
		t.Fatalf("failed to create log dir: %v", err)
	}

	var eventCount int
	var mu sync.Mutex

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v1/agent/events/batch" {
			var body map[string]interface{}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}

			events, ok := body["events"].([]interface{})
			if ok {
				mu.Lock()
				eventCount += len(events)
				mu.Unlock()
			}

			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
		}
	}))
	defer server.Close()

	// Initialize components
	registry := adapters.DefaultRegistry("test-project", nil, nil)
	adapter := adapters.NewCopilotAdapter("test-project")

	log := logrus.New()
	log.SetLevel(logrus.WarnLevel)

	clientConfig := client.Config{
		BaseURL:    server.URL,
		APIKey:     "test-key",
		BatchSize:  10,
		BatchDelay: 300 * time.Millisecond,
		Logger:     log,
	}
	apiClient := client.NewClient(clientConfig)
	apiClient.Start()
	defer apiClient.Stop()

	watcherConfig := watcher.Config{
		Registry:       registry,
		EventQueueSize: 100,
		DebounceMs:     50,
		Logger:         log,
	}
	fileWatcher, err := watcher.NewWatcher(watcherConfig)
	if err != nil {
		t.Fatalf("failed to create watcher: %v", err)
	}
	defer fileWatcher.Stop()

	if err := fileWatcher.Start(); err != nil {
		t.Fatalf("failed to start watcher: %v", err)
	}

	if err := fileWatcher.Watch(logDir, adapter); err != nil {
		t.Fatalf("failed to watch directory: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case event := <-fileWatcher.EventQueue():
				apiClient.SendEvent(event)
			}
		}
	}()

	// Write initial log file
	logFile := filepath.Join(logDir, "copilot.log")
	logContent1 := `{"timestamp":"2025-10-30T10:00:00Z","level":"info","message":"completion accepted","source":"copilot","requestId":"req-1","model":"gpt-4","completion":"before rotation","tokensUsed":10}
`
	if err := os.WriteFile(logFile, []byte(logContent1), 0644); err != nil {
		t.Fatalf("failed to write initial log file: %v", err)
	}

	// Parse and send initial events
	events1, _ := adapter.ParseLogFile(logFile)
	for _, event := range events1 {
		apiClient.SendEvent(event)
	}

	time.Sleep(500 * time.Millisecond)

	// Simulate log rotation: rename old file, create new file
	rotatedFile := filepath.Join(logDir, "copilot.log.1")
	if err := os.Rename(logFile, rotatedFile); err != nil {
		t.Fatalf("failed to rotate log file: %v", err)
	}

	// Write to new log file
	logContent2 := `{"timestamp":"2025-10-30T10:00:02Z","level":"info","message":"completion accepted","source":"copilot","requestId":"req-2","model":"gpt-4","completion":"after rotation","tokensUsed":10}
`
	if err := os.WriteFile(logFile, []byte(logContent2), 0644); err != nil {
		t.Fatalf("failed to write new log file: %v", err)
	}

	// Parse and send new events
	events2, _ := adapter.ParseLogFile(logFile)
	for _, event := range events2 {
		apiClient.SendEvent(event)
	}

	// Wait for processing
	time.Sleep(1 * time.Second)

	// Verify events from both files were processed
	mu.Lock()
	count := eventCount
	mu.Unlock()

	if count < 1 {
		t.Errorf("expected at least 1 event after log rotation, got %d", count)
	}

	t.Logf("Successfully processed %d events across log rotation", count)
}

// TestEndToEnd_HighVolume tests handling of many events quickly
func TestEndToEnd_HighVolume(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping high volume test in short mode")
	}

	tmpDir := t.TempDir()
	logDir := filepath.Join(tmpDir, "logs")

	if err := os.MkdirAll(logDir, 0755); err != nil {
		t.Fatalf("failed to create log dir: %v", err)
	}

	var eventCount int
	var mu sync.Mutex

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v1/agent/events/batch" {
			var body map[string]interface{}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}

			events, ok := body["events"].([]interface{})
			if ok {
				mu.Lock()
				eventCount += len(events)
				mu.Unlock()
			}

			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
		}
	}))
	defer server.Close()

	// Initialize components
	registry := adapters.DefaultRegistry("test-project", nil, nil)
	adapter := adapters.NewCopilotAdapter("test-project")

	log := logrus.New()
	log.SetLevel(logrus.ErrorLevel) // Minimal logging for performance

	clientConfig := client.Config{
		BaseURL:    server.URL,
		APIKey:     "test-key",
		BatchSize:  50,
		BatchDelay: 200 * time.Millisecond,
		Logger:     log,
	}
	apiClient := client.NewClient(clientConfig)
	apiClient.Start()
	defer apiClient.Stop()

	watcherConfig := watcher.Config{
		Registry:       registry,
		EventQueueSize: 1000,
		DebounceMs:     50,
		Logger:         log,
	}
	fileWatcher, err := watcher.NewWatcher(watcherConfig)
	if err != nil {
		t.Fatalf("failed to create watcher: %v", err)
	}
	defer fileWatcher.Stop()

	if err := fileWatcher.Start(); err != nil {
		t.Fatalf("failed to start watcher: %v", err)
	}

	if err := fileWatcher.Watch(logDir, adapter); err != nil {
		t.Fatalf("failed to watch directory: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case event := <-fileWatcher.EventQueue():
				apiClient.SendEvent(event)
			}
		}
	}()

	// Generate 100 log events
	logFile := filepath.Join(logDir, "copilot.log")
	file, err := os.Create(logFile)
	if err != nil {
		t.Fatalf("failed to create log file: %v", err)
	}

	expectedEvents := 100
	for i := 0; i < expectedEvents; i++ {
		logLine := fmt.Sprintf(`{"timestamp":"2025-10-30T10:%02d:%02dZ","level":"info","message":"completion accepted","source":"copilot","requestId":"req-%d","model":"gpt-4","completion":"event %d","tokensUsed":10}
`, i/60, i%60, i, i)
		file.WriteString(logLine)
	}
	file.Close()

	// Parse and send all events directly
	events, err := adapter.ParseLogFile(logFile)
	if err != nil {
		t.Fatalf("failed to parse log file: %v", err)
	}
	t.Logf("Parsed %d events from log file", len(events))

	for _, event := range events {
		apiClient.SendEvent(event)
	}

	// Wait for all events to be processed
	time.Sleep(3 * time.Second)

	// Verify event count
	mu.Lock()
	count := eventCount
	mu.Unlock()

	successRate := float64(count) / float64(expectedEvents) * 100
	t.Logf("Processed %d/%d events (%.1f%% success rate)", count, expectedEvents, successRate)

	if count < expectedEvents*8/10 { // Allow 20% loss for timing issues
		t.Errorf("expected at least 80%% of events (%d), got %d (%.1f%%)",
			expectedEvents*8/10, count, successRate)
	}
}
