package watcher

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/codervisor/devlog/internal/adapters"
	"github.com/codervisor/devlog/pkg/types"
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
	watching   map[string]bool             // tracked file paths
	adapters   map[string]adapters.AgentAdapter // path -> adapter mapping for new file detection
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
		adapters:   make(map[string]adapters.AgentAdapter),
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

	// Store adapter for this path (for new file detection)
	w.adapters[path] = adapter

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
		w.adapters[logFile] = adapter
		w.log.Debugf("Watching file: %s", logFile)
	}

	// Also watch the directory itself for new files
	if err := w.fsWatcher.Add(dirPath); err != nil {
		return fmt.Errorf("failed to watch directory: %w", err)
	}
	w.watching[dirPath] = true
	w.adapters[dirPath] = adapter

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
	// Handle Create events for new files (file rotation / new chat sessions)
	if event.Op&fsnotify.Create != 0 {
		w.handleNewFile(event.Name)
		return
	}

	// Only handle Write events for existing files
	if event.Op&fsnotify.Write == 0 {
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

// handleNewFile handles newly created files (file rotation / new chat sessions)
func (w *Watcher) handleNewFile(filePath string) {
	// Check if it's a log file
	if !isLogFile(filePath) {
		return
	}

	// Check if it's a new directory (new workspace)
	info, err := os.Stat(filePath)
	if err != nil {
		return
	}

	w.mu.Lock()
	defer w.mu.Unlock()

	// Already watching this path
	if w.watching[filePath] {
		return
	}

	// Find the adapter for the parent directory
	parentDir := filepath.Dir(filePath)
	adapter, ok := w.adapters[parentDir]
	if !ok {
		// Try to find adapter from registry using file sample
		sample, err := readFileSample(filePath, 1024)
		if err != nil {
			w.log.Debugf("Failed to read sample from new file %s: %v", filePath, err)
			return
		}
		adapter, err = w.registry.DetectAdapter(sample)
		if err != nil {
			w.log.Debugf("No adapter found for new file %s", filePath)
			return
		}
	}

	if info.IsDir() {
		// New directory (possibly new workspace)
		w.log.Infof("New directory detected: %s", filePath)
		// Watch it without holding lock (release and reacquire)
		w.mu.Unlock()
		if err := w.Watch(filePath, adapter); err != nil {
			w.log.Warnf("Failed to watch new directory %s: %v", filePath, err)
		}
		w.mu.Lock()
	} else {
		// New file (file rotation / new chat session)
		w.log.Infof("New log file detected: %s", filepath.Base(filePath))
		if err := w.fsWatcher.Add(filePath); err != nil {
			w.log.Warnf("Failed to watch new file %s: %v", filePath, err)
			return
		}
		w.watching[filePath] = true
		w.adapters[filePath] = adapter

		// Process the new file after a short delay (let it finish writing)
		go func() {
			time.Sleep(500 * time.Millisecond)
			w.processLogFile(filePath)
		}()
	}
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

// WatchParentDirs watches parent directories for new workspaces (e.g., VS Code workspaceStorage)
// This enables detecting new workspaces when they are created (user opens new project in VS Code)
func (w *Watcher) WatchParentDirs(paths []string, adapter adapters.AgentAdapter) error {
	for _, path := range paths {
		// Get the parent directory (workspaceStorage for copilot)
		parentDir := filepath.Dir(path)

		w.mu.Lock()
		alreadyWatching := w.watching[parentDir]
		w.mu.Unlock()

		if alreadyWatching {
			continue
		}

		// Check if parent exists
		if _, err := os.Stat(parentDir); os.IsNotExist(err) {
			continue
		}

		// Watch the parent directory for new workspace subdirectories
		if err := w.fsWatcher.Add(parentDir); err != nil {
			w.log.Warnf("Failed to watch parent directory %s: %v", parentDir, err)
			continue
		}

		w.mu.Lock()
		w.watching[parentDir] = true
		w.adapters[parentDir] = adapter
		w.mu.Unlock()

		w.log.Debugf("Watching parent directory for new workspaces: %s", parentDir)
	}

	return nil
}

// StartDynamicDiscovery starts a background goroutine that periodically scans for new workspaces
func (w *Watcher) StartDynamicDiscovery(interval time.Duration, onNewWorkspace func(string, adapters.AgentAdapter)) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-w.ctx.Done():
				return
			case <-ticker.C:
				// Discover all agent logs and check for new ones
				discovered, err := DiscoverAllAgentLogs()
				if err != nil {
					w.log.Warnf("Dynamic discovery error: %v", err)
					continue
				}

				for agentName, logs := range discovered {
					for _, logInfo := range logs {
						w.mu.Lock()
						isNew := !w.watching[logInfo.Path]
						w.mu.Unlock()

						if isNew {
							w.log.Infof("Discovered new workspace: %s (%s)", logInfo.Path, agentName)
							if onNewWorkspace != nil {
								// Get adapter for this agent
								adapter, err := w.registry.Get(agentName)
								if err != nil {
									w.log.Warnf("No adapter for %s, skipping", agentName)
									continue
								}
								onNewWorkspace(logInfo.Path, adapter)
							}
						}
					}
				}
			}
		}
	}()
}
