package buffer

import (
	"os"
	"testing"
	"time"

	"github.com/codervisor/devlog/collector/pkg/types"
	"github.com/google/uuid"
)

func TestBuffer_StoreAndRetrieve(t *testing.T) {
	// Create temp database
	tmpFile, err := os.CreateTemp("", "test-buffer-*.db")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	tmpFile.Close()

	// Create buffer
	config := Config{
		DBPath:  tmpFile.Name(),
		MaxSize: 100,
	}

	buffer, err := NewBuffer(config)
	if err != nil {
		t.Fatalf("failed to create buffer: %v", err)
	}
	defer buffer.Close()

	// Create test event
	event := &types.AgentEvent{
		ID:        uuid.New().String(),
		Timestamp: time.Now(),
		Type:      types.EventTypeLLMRequest,
		AgentID:   "test-agent",
		SessionID: "test-session",
		ProjectID: "test-project",
		Data:      map[string]interface{}{"test": "data"},
	}

	// Store event
	if err := buffer.Store(event); err != nil {
		t.Fatalf("failed to store event: %v", err)
	}

	// Check count
	count, err := buffer.Count()
	if err != nil {
		t.Fatalf("failed to count events: %v", err)
	}

	if count != 1 {
		t.Errorf("expected count=1, got %d", count)
	}

	// Retrieve events
	events, err := buffer.Retrieve(10)
	if err != nil {
		t.Fatalf("failed to retrieve events: %v", err)
	}

	if len(events) != 1 {
		t.Errorf("expected 1 event, got %d", len(events))
	}

	if events[0].ID != event.ID {
		t.Errorf("expected event ID %s, got %s", event.ID, events[0].ID)
	}
}

func TestBuffer_MaxSizeEviction(t *testing.T) {
	// Create temp database
	tmpFile, err := os.CreateTemp("", "test-buffer-*.db")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	tmpFile.Close()

	// Create buffer with small max size
	config := Config{
		DBPath:  tmpFile.Name(),
		MaxSize: 3,
	}

	buffer, err := NewBuffer(config)
	if err != nil {
		t.Fatalf("failed to create buffer: %v", err)
	}
	defer buffer.Close()

	// Store 5 events (should evict 2 oldest)
	for i := 0; i < 5; i++ {
		event := &types.AgentEvent{
			ID:        uuid.New().String(),
			Timestamp: time.Now().Add(time.Duration(i) * time.Second),
			Type:      types.EventTypeLLMRequest,
			AgentID:   "test-agent",
			SessionID: "test-session",
			ProjectID: "test-project",
			Data:      map[string]interface{}{"index": i},
		}

		if err := buffer.Store(event); err != nil {
			t.Fatalf("failed to store event %d: %v", i, err)
		}

		time.Sleep(10 * time.Millisecond) // Ensure different created_at times
	}

	// Check count (should be capped at maxSize)
	count, err := buffer.Count()
	if err != nil {
		t.Fatalf("failed to count events: %v", err)
	}

	if count != 3 {
		t.Errorf("expected count=3 (max size), got %d", count)
	}

	// Verify oldest events were evicted
	events, err := buffer.Retrieve(10)
	if err != nil {
		t.Fatalf("failed to retrieve events: %v", err)
	}

	if len(events) != 3 {
		t.Errorf("expected 3 events, got %d", len(events))
	}

	// Check that we have the newest events (indices 2, 3, 4)
	for _, event := range events {
		index := event.Data["index"].(float64) // JSON unmarshals numbers as float64
		if index < 2 {
			t.Errorf("found evicted event with index %v", index)
		}
	}
}

func TestBuffer_Delete(t *testing.T) {
	// Create temp database
	tmpFile, err := os.CreateTemp("", "test-buffer-*.db")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	tmpFile.Close()

	// Create buffer
	config := Config{
		DBPath:  tmpFile.Name(),
		MaxSize: 100,
	}

	buffer, err := NewBuffer(config)
	if err != nil {
		t.Fatalf("failed to create buffer: %v", err)
	}
	defer buffer.Close()

	// Store events
	eventIDs := []string{}
	for i := 0; i < 3; i++ {
		event := &types.AgentEvent{
			ID:        uuid.New().String(),
			Timestamp: time.Now(),
			Type:      types.EventTypeLLMRequest,
			AgentID:   "test-agent",
			SessionID: "test-session",
			ProjectID: "test-project",
			Data:      map[string]interface{}{"index": i},
		}

		eventIDs = append(eventIDs, event.ID)
		if err := buffer.Store(event); err != nil {
			t.Fatalf("failed to store event: %v", err)
		}
	}

	// Delete first two events
	if err := buffer.Delete(eventIDs[:2]); err != nil {
		t.Fatalf("failed to delete events: %v", err)
	}

	// Check count
	count, err := buffer.Count()
	if err != nil {
		t.Fatalf("failed to count events: %v", err)
	}

	if count != 1 {
		t.Errorf("expected count=1, got %d", count)
	}

	// Verify correct event remains
	events, err := buffer.Retrieve(10)
	if err != nil {
		t.Fatalf("failed to retrieve events: %v", err)
	}

	if len(events) != 1 {
		t.Errorf("expected 1 event, got %d", len(events))
	}

	if events[0].ID != eventIDs[2] {
		t.Errorf("wrong event remained, expected %s got %s", eventIDs[2], events[0].ID)
	}
}

func TestBuffer_GetStats(t *testing.T) {
	// Create temp database
	tmpFile, err := os.CreateTemp("", "test-buffer-*.db")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	tmpFile.Close()

	// Create buffer
	config := Config{
		DBPath:  tmpFile.Name(),
		MaxSize: 100,
	}

	buffer, err := NewBuffer(config)
	if err != nil {
		t.Fatalf("failed to create buffer: %v", err)
	}
	defer buffer.Close()

	// Store some events
	for i := 0; i < 5; i++ {
		event := &types.AgentEvent{
			ID:        uuid.New().String(),
			Timestamp: time.Now(),
			Type:      types.EventTypeLLMRequest,
			AgentID:   "test-agent",
			SessionID: "test-session",
			ProjectID: "test-project",
			Data:      map[string]interface{}{"index": i},
		}

		if err := buffer.Store(event); err != nil {
			t.Fatalf("failed to store event: %v", err)
		}
	}

	// Get stats
	stats, err := buffer.GetStats()
	if err != nil {
		t.Fatalf("failed to get stats: %v", err)
	}

	if stats["count"] != 5 {
		t.Errorf("expected count=5, got %v", stats["count"])
	}

	if stats["max_size"] != 100 {
		t.Errorf("expected max_size=100, got %v", stats["max_size"])
	}

	usage := stats["usage"].(float64)
	if usage != 5.0 {
		t.Errorf("expected usage=5%%, got %v%%", usage)
	}
}
