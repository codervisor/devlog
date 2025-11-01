package client

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/codervisor/devlog/collector/pkg/types"
	"github.com/google/uuid"
)

func TestClient_SendBatch(t *testing.T) {
	// Create mock server
	eventsReceived := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v1/agent/events/batch" {
			var body map[string]interface{}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Errorf("failed to decode request: %v", err)
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}

			events, ok := body["events"].([]interface{})
			if !ok {
				t.Error("events field missing or invalid")
				http.Error(w, "invalid events", http.StatusBadRequest)
				return
			}

			eventsReceived += len(events)
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
		}
	}))
	defer server.Close()

	// Create client
	config := Config{
		BaseURL:    server.URL,
		APIKey:     "test-key",
		BatchSize:  2,
		BatchDelay: 100 * time.Millisecond,
	}

	client := NewClient(config)
	client.Start()
	defer client.Stop()

	// Send events
	event1 := &types.AgentEvent{
		ID:        uuid.New().String(),
		Timestamp: time.Now(),
		Type:      types.EventTypeLLMRequest,
		AgentID:   "test-agent",
		SessionID: "test-session",
		ProjectID: "test-project",
		Data:      map[string]interface{}{"test": "data"},
	}

	event2 := &types.AgentEvent{
		ID:        uuid.New().String(),
		Timestamp: time.Now(),
		Type:      types.EventTypeLLMResponse,
		AgentID:   "test-agent",
		SessionID: "test-session",
		ProjectID: "test-project",
		Data:      map[string]interface{}{"test": "data2"},
	}

	// Send events
	if err := client.SendEvent(event1); err != nil {
		t.Fatalf("failed to send event1: %v", err)
	}

	if err := client.SendEvent(event2); err != nil {
		t.Fatalf("failed to send event2: %v", err)
	}

	// Wait for batch to be sent
	time.Sleep(300 * time.Millisecond)

	if eventsReceived != 2 {
		t.Errorf("expected 2 events received, got %d", eventsReceived)
	}
}

func TestClient_HealthCheck(t *testing.T) {
	// Create mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/health" {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
		}
	}))
	defer server.Close()

	// Create client
	config := Config{
		BaseURL: server.URL,
		APIKey:  "test-key",
	}

	client := NewClient(config)

	// Test health check
	if err := client.HealthCheck(); err != nil {
		t.Errorf("health check failed: %v", err)
	}
}

func TestClient_RetryOnFailure(t *testing.T) {
	attempts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < 3 {
			// Fail first 2 attempts
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		// Succeed on 3rd attempt
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	}))
	defer server.Close()

	config := Config{
		BaseURL:    server.URL,
		APIKey:     "test-key",
		BatchSize:  1,
		MaxRetries: 3,
	}

	client := NewClient(config)
	client.Start()
	defer client.Stop()

	event := &types.AgentEvent{
		ID:        uuid.New().String(),
		Timestamp: time.Now(),
		Type:      types.EventTypeLLMRequest,
		AgentID:   "test-agent",
		SessionID: "test-session",
		ProjectID: "test-project",
		Data:      map[string]interface{}{"test": "data"},
	}

	if err := client.SendEvent(event); err != nil {
		t.Fatalf("failed to send event: %v", err)
	}

	// Wait for retries
	time.Sleep(5 * time.Second)

	if attempts < 3 {
		t.Errorf("expected at least 3 attempts, got %d", attempts)
	}
}

func TestClient_GetStats(t *testing.T) {
	config := Config{
		BaseURL:   "http://localhost:3200",
		APIKey:    "test-key",
		BatchSize: 10,
	}

	client := NewClient(config)

	stats := client.GetStats()

	if stats["batch_size"] != 10 {
		t.Errorf("expected batch_size=10, got %v", stats["batch_size"])
	}

	if stats["pending_events"] != 0 {
		t.Errorf("expected pending_events=0, got %v", stats["pending_events"])
	}
}
