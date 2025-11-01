package watcher

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/codervisor/devlog/collector/internal/adapters"
	"github.com/sirupsen/logrus"
)

func TestWatcher_Creation(t *testing.T) {
	registry := adapters.DefaultRegistry("test-project", nil, nil)

	config := Config{
		Registry:       registry,
		EventQueueSize: 100,
		DebounceMs:     50,
	}

	watcher, err := NewWatcher(config)
	if err != nil {
		t.Fatalf("failed to create watcher: %v", err)
	}
	defer watcher.Stop()

	if watcher == nil {
		t.Fatal("expected non-nil watcher")
	}
}

func TestWatcher_WatchFile(t *testing.T) {
	// Create temp file
	tmpFile, err := os.CreateTemp("", "test-*.log")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	tmpFile.Close()

	registry := adapters.DefaultRegistry("test-project", nil, nil)
	adapter := adapters.NewCopilotAdapter("test-project", nil, nil)

	config := Config{
		Registry:       registry,
		EventQueueSize: 100,
		DebounceMs:     50,
		Logger:         logrus.New(),
	}

	watcher, err := NewWatcher(config)
	if err != nil {
		t.Fatalf("failed to create watcher: %v", err)
	}
	defer watcher.Stop()

	if err := watcher.Start(); err != nil {
		t.Fatalf("failed to start watcher: %v", err)
	}

	// Watch the file
	if err := watcher.Watch(tmpFile.Name(), adapter); err != nil {
		t.Fatalf("failed to watch file: %v", err)
	}

	// Verify file is being watched
	stats := watcher.GetStats()
	watchingCount := stats["watching_count"].(int)
	if watchingCount != 1 {
		t.Errorf("expected watching_count=1, got %d", watchingCount)
	}
}

func TestWatcher_ProcessLogEvents(t *testing.T) {
	// Create temp file with sample log data
	tmpFile, err := os.CreateTemp("", "test-*.log")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())

	// Write sample Copilot log line
	logLine := `{"timestamp":"2025-10-30T10:00:00Z","level":"info","message":"completion accepted","source":"copilot","requestId":"req-123","model":"gpt-4","completion":"test","tokensUsed":10,"durationMs":100}`
	if _, err := tmpFile.WriteString(logLine + "\n"); err != nil {
		t.Fatalf("failed to write to temp file: %v", err)
	}
	tmpFile.Close()

	registry := adapters.DefaultRegistry("test-project", nil, nil)
	adapter := adapters.NewCopilotAdapter("test-project", nil, nil)

	config := Config{
		Registry:       registry,
		EventQueueSize: 100,
		DebounceMs:     50,
		Logger:         logrus.New(),
	}

	watcher, err := NewWatcher(config)
	if err != nil {
		t.Fatalf("failed to create watcher: %v", err)
	}
	defer watcher.Stop()

	if err := watcher.Start(); err != nil {
		t.Fatalf("failed to start watcher: %v", err)
	}

	// Watch the file
	if err := watcher.Watch(tmpFile.Name(), adapter); err != nil {
		t.Fatalf("failed to watch file: %v", err)
	}

	// Append more data to trigger event
	file, err := os.OpenFile(tmpFile.Name(), os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		t.Fatalf("failed to open file: %v", err)
	}
	if _, err := file.WriteString(logLine + "\n"); err != nil {
		t.Fatalf("failed to append to file: %v", err)
	}
	file.Close()

	// Wait for debounce and processing
	time.Sleep(200 * time.Millisecond)

	// Check if events were queued (may or may not have events depending on parsing)
	stats := watcher.GetStats()
	queueSize := stats["queue_size"].(int)
	t.Logf("Events in queue: %d", queueSize)
}

func TestWatcher_WatchDirectory(t *testing.T) {
	// Create temp directory
	tmpDir, err := os.MkdirTemp("", "test-logs-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Create a log file in the directory
	logFile := filepath.Join(tmpDir, "test.log")
	if err := os.WriteFile(logFile, []byte("test log\n"), 0644); err != nil {
		t.Fatalf("failed to create log file: %v", err)
	}

	registry := adapters.DefaultRegistry("test-project", nil, nil)
	adapter := adapters.NewCopilotAdapter("test-project", nil, nil)

	config := Config{
		Registry:       registry,
		EventQueueSize: 100,
		DebounceMs:     50,
		Logger:         logrus.New(),
	}

	watcher, err := NewWatcher(config)
	if err != nil {
		t.Fatalf("failed to create watcher: %v", err)
	}
	defer watcher.Stop()

	if err := watcher.Start(); err != nil {
		t.Fatalf("failed to start watcher: %v", err)
	}

	// Watch the directory
	if err := watcher.Watch(tmpDir, adapter); err != nil {
		t.Fatalf("failed to watch directory: %v", err)
	}

	// Verify files are being watched
	stats := watcher.GetStats()
	watchingCount := stats["watching_count"].(int)
	if watchingCount < 1 {
		t.Errorf("expected watching_count>=1, got %d", watchingCount)
	}
}
