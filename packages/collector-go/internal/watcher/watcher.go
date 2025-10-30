package watcher

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/codervisor/devlog/collector/internal/adapters"
	"github.com/codervisor/devlog/collector/pkg/types"
	"github.com/fsnotify/fsnotify"
	"github.com/sirupsen/logrus"
)

// Watcher monitors log files for changes
type Watcher struct {
	fsWatcher  *fsnotify.Watcher
	registry   *adapters.Registry
	eventQueue chan *types.AgentEvent
	log        *logrus.Logger
	mu         sync.Mutex
	watching   map[string]bool // tracked file paths
	debounce   time.Duration
	debouncers map[string]*time.Timer
	ctx        context.Context
	cancel     context.CancelFunc
}

// Config holds watcher configuration
type Config struct {
	Registry       *adapters.Registry
	EventQueueSize int
	DebounceMs     int
	Logger         *logrus.Logger
}

// NewWatcher creates a new file system watcher
func NewWatcher(config Config) (*Watcher, error) {
	fsWatcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, fmt.Errorf("failed to create fs watcher: %w", err)
	}

	ctx, cancel := context.WithCancel(context.Background())

	if config.Logger == nil {
		config.Logger = logrus.New()
	}

	if config.EventQueueSize == 0 {
		config.EventQueueSize = 1000
	}

	if config.DebounceMs == 0 {
		config.DebounceMs = 100
	}

	w := &Watcher{
		fsWatcher:  fsWatcher,
		registry:   config.Registry,
		eventQueue: make(chan *types.AgentEvent, config.EventQueueSize),
		log:        config.Logger,
		watching:   make(map[string]bool),
		debounce:   time.Duration(config.DebounceMs) * time.Millisecond,
		debouncers: make(map[string]*time.Timer),
		ctx:        ctx,
		cancel:     cancel,
	}

	return w, nil
}

// Start begins watching for file changes
func (w *Watcher) Start() error {
	w.log.Info("Starting file watcher...")

	go w.processEvents()

	return nil
}

// Stop stops watching and cleans up resources
func (w *Watcher) Stop() error {
	w.log.Info("Stopping file watcher...")
	w.cancel()

	// Close fs watcher
	if err := w.fsWatcher.Close(); err != nil {
		return fmt.Errorf("failed to close fs watcher: %w", err)
	}

	// Close event queue
	close(w.eventQueue)

	return nil
}

// Watch adds a file or directory to watch
func (w *Watcher) Watch(path string, adapter adapters.AgentAdapter) error {
	w.mu.Lock()
	defer w.mu.Unlock()

	// Check if already watching
	if w.watching[path] {
		return nil
	}

	// Check if path exists
	info, err := os.Stat(path)
	if err != nil {
		return fmt.Errorf("failed to stat path: %w", err)
	}

	// If it's a directory, watch recursively
	if info.IsDir() {
		if err := w.watchDir(path, adapter); err != nil {
			return fmt.Errorf("failed to watch directory: %w", err)
		}
	} else {
		// Watch single file
		if err := w.fsWatcher.Add(path); err != nil {
			return fmt.Errorf("failed to add file to watcher: %w", err)
		}
		w.watching[path] = true
		w.log.Infof("Watching file: %s", path)
	}

	return nil
}

// watchDir recursively watches a directory
func (w *Watcher) watchDir(dirPath string, adapter adapters.AgentAdapter) error {
	// Find all log files in directory
	logFiles, err := FindLogFiles(dirPath)
	if err != nil {
		return err
	}

	// Watch each log file
	for _, logFile := range logFiles {
		if err := w.fsWatcher.Add(logFile); err != nil {
			w.log.Warnf("Failed to watch %s: %v", logFile, err)
			continue
		}
		w.watching[logFile] = true
		w.log.Debugf("Watching file: %s", logFile)
	}

	// Also watch the directory itself for new files
	if err := w.fsWatcher.Add(dirPath); err != nil {
		return fmt.Errorf("failed to watch directory: %w", err)
	}

	return nil
}

// EventQueue returns the channel for receiving parsed events
func (w *Watcher) EventQueue() <-chan *types.AgentEvent {
	return w.eventQueue
}

// processEvents handles file system events
func (w *Watcher) processEvents() {
	for {
		select {
		case <-w.ctx.Done():
			return

		case event, ok := <-w.fsWatcher.Events:
			if !ok {
				return
			}

			w.handleFileEvent(event)

		case err, ok := <-w.fsWatcher.Errors:
			if !ok {
				return
			}
			w.log.Errorf("Watcher error: %v", err)
		}
	}
}

// handleFileEvent processes a single file system event with debouncing
func (w *Watcher) handleFileEvent(event fsnotify.Event) {
	// Only handle Write and Create events
	if event.Op&fsnotify.Write == 0 && event.Op&fsnotify.Create == 0 {
		return
	}

	// Check if it's a log file
	if !isLogFile(event.Name) {
		return
	}

	w.mu.Lock()
	defer w.mu.Unlock()

	// Cancel existing debounce timer
	if timer, exists := w.debouncers[event.Name]; exists {
		timer.Stop()
	}

	// Create new debounce timer
	w.debouncers[event.Name] = time.AfterFunc(w.debounce, func() {
		w.processLogFile(event.Name)

		// Clean up debouncer
		w.mu.Lock()
		delete(w.debouncers, event.Name)
		w.mu.Unlock()
	})
}

// processLogFile reads and parses a log file
func (w *Watcher) processLogFile(filePath string) {
	w.log.Debugf("Processing log file: %s", filePath)

	// Detect adapter for this file
	sample, err := readFileSample(filePath, 1024)
	if err != nil {
		w.log.Warnf("Failed to read sample from %s: %v", filePath, err)
		return
	}

	adapter, err := w.registry.DetectAdapter(sample)
	if err != nil {
		w.log.Debugf("No adapter found for %s", filePath)
		return
	}

	// Parse log file
	events, err := adapter.ParseLogFile(filePath)
	if err != nil {
		w.log.Warnf("Failed to parse log file %s: %v", filePath, err)
		return
	}

	// Send events to queue
	for _, event := range events {
		select {
		case w.eventQueue <- event:
			// Event queued successfully
		case <-w.ctx.Done():
			return
		default:
			// Queue full, log warning
			w.log.Warn("Event queue full, dropping event")
		}
	}

	if len(events) > 0 {
		w.log.Infof("Parsed %d events from %s using %s adapter",
			len(events), filepath.Base(filePath), adapter.Name())
	}
}

// readFileSample reads the first N bytes of a file
func readFileSample(filePath string, size int) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	buf := make([]byte, size)
	n, err := file.Read(buf)
	if err != nil && n == 0 {
		return "", err
	}

	return string(buf[:n]), nil
}

// GetStats returns watcher statistics
func (w *Watcher) GetStats() map[string]interface{} {
	w.mu.Lock()
	defer w.mu.Unlock()

	return map[string]interface{}{
		"watching_count":    len(w.watching),
		"queue_size":        len(w.eventQueue),
		"queue_capacity":    cap(w.eventQueue),
		"active_debouncers": len(w.debouncers),
	}
}
