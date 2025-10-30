package backfill

import (
	"bufio"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/codervisor/devlog/collector/internal/adapters"
	"github.com/codervisor/devlog/collector/internal/buffer"
	"github.com/codervisor/devlog/collector/internal/client"
	"github.com/codervisor/devlog/collector/pkg/types"
	"github.com/sirupsen/logrus"
)

// BackfillManager manages historical log backfill operations
type BackfillManager struct {
	registry   *adapters.Registry
	buffer     *buffer.Buffer
	client     *client.Client
	stateStore *StateStore
	log        *logrus.Logger
}

// Config holds backfill manager configuration
type Config struct {
	Registry    *adapters.Registry
	Buffer      *buffer.Buffer
	Client      *client.Client
	StateDBPath string
	Logger      *logrus.Logger
}

// BackfillConfig specifies parameters for a backfill operation
type BackfillConfig struct {
	AgentName  string
	LogPath    string
	FromDate   time.Time
	ToDate     time.Time
	DryRun     bool
	BatchSize  int
	ProgressCB ProgressFunc
}

// BackfillResult contains the results of a backfill operation
type BackfillResult struct {
	TotalEvents     int
	ProcessedEvents int
	SkippedEvents   int
	ErrorEvents     int
	Duration        time.Duration
	BytesProcessed  int64
}

// Progress represents the current progress of a backfill operation
type Progress struct {
	AgentName       string
	FilePath        string
	BytesProcessed  int64
	TotalBytes      int64
	EventsProcessed int
	Percentage      float64
	EstimatedTime   time.Duration
}

// ProgressFunc is a callback for progress updates
type ProgressFunc func(Progress)

// NewBackfillManager creates a new backfill manager
func NewBackfillManager(config Config) (*BackfillManager, error) {
	if config.Logger == nil {
		config.Logger = logrus.New()
	}

	// Initialize state store
	stateStore, err := NewStateStore(config.StateDBPath)
	if err != nil {
		return nil, fmt.Errorf("failed to create state store: %w", err)
	}

	return &BackfillManager{
		registry:   config.Registry,
		buffer:     config.Buffer,
		client:     config.Client,
		stateStore: stateStore,
		log:        config.Logger,
	}, nil
}

// Backfill processes historical logs according to the configuration
func (bm *BackfillManager) Backfill(ctx context.Context, config BackfillConfig) (*BackfillResult, error) {
	bm.log.Infof("Starting backfill for agent: %s", config.AgentName)
	bm.log.Infof("Log path: %s", config.LogPath)
	bm.log.Infof("Date range: %s to %s", config.FromDate.Format("2006-01-02"), config.ToDate.Format("2006-01-02"))

	startTime := time.Now()

	// Get adapter for this agent
	adapter, err := bm.registry.Get(config.AgentName)
	if err != nil {
		return nil, fmt.Errorf("no adapter found for agent %s: %w", config.AgentName, err)
	}

	// Check if path is file or directory
	fileInfo, err := os.Stat(config.LogPath)
	if err != nil {
		return nil, fmt.Errorf("failed to stat log path: %w", err)
	}

	var result *BackfillResult

	if fileInfo.IsDir() {
		// Process all log files in directory
		result, err = bm.backfillDirectory(ctx, config, adapter)
	} else {
		// Process single file
		result, err = bm.backfillFile(ctx, config, adapter, config.LogPath)
	}

	if err != nil {
		return nil, err
	}

	result.Duration = time.Since(startTime)
	bm.log.Infof("Backfill completed in %s", result.Duration)
	bm.log.Infof("Processed: %d, Skipped: %d, Errors: %d",
		result.ProcessedEvents, result.SkippedEvents, result.ErrorEvents)

	return result, nil
}

// backfillDirectory processes all log files in a directory
func (bm *BackfillManager) backfillDirectory(ctx context.Context, config BackfillConfig, adapter adapters.AgentAdapter) (*BackfillResult, error) {
	bm.log.Infof("Scanning directory: %s", config.LogPath)

	// Find all log files
	var logFiles []string
	err := filepath.Walk(config.LogPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && isLogFile(path) {
			logFiles = append(logFiles, path)
		}
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to scan directory: %w", err)
	}

	bm.log.Infof("Found %d log files", len(logFiles))

	// Process each file
	combinedResult := &BackfillResult{}
	for _, logFile := range logFiles {
		select {
		case <-ctx.Done():
			return combinedResult, ctx.Err()
		default:
		}

		bm.log.Infof("Processing file: %s", filepath.Base(logFile))
		result, err := bm.backfillFile(ctx, config, adapter, logFile)
		if err != nil {
			bm.log.Warnf("Failed to process %s: %v", logFile, err)
			combinedResult.ErrorEvents++
			continue
		}

		// Aggregate results
		combinedResult.TotalEvents += result.TotalEvents
		combinedResult.ProcessedEvents += result.ProcessedEvents
		combinedResult.SkippedEvents += result.SkippedEvents
		combinedResult.ErrorEvents += result.ErrorEvents
		combinedResult.BytesProcessed += result.BytesProcessed
	}

	return combinedResult, nil
}

// backfillFile processes a single log file
func (bm *BackfillManager) backfillFile(ctx context.Context, config BackfillConfig, adapter adapters.AgentAdapter, filePath string) (*BackfillResult, error) {
	// Load state
	state, err := bm.stateStore.Load(config.AgentName, filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to load state: %w", err)
	}

	// Skip if already completed
	if state.Status == StatusCompleted {
		bm.log.Infof("File already processed: %s", filePath)
		return &BackfillResult{SkippedEvents: state.TotalEventsProcessed}, nil
	}

	// Update status to in progress
	state.Status = StatusInProgress
	if err := bm.stateStore.Save(state); err != nil {
		return nil, fmt.Errorf("failed to save state: %w", err)
	}

	// Open file
	file, err := os.Open(filePath)
	if err != nil {
		state.Status = StatusFailed
		state.ErrorMessage = err.Error()
		bm.stateStore.Save(state)
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Get file size for progress tracking
	fileInfo, _ := file.Stat()
	totalBytes := fileInfo.Size()

	// Seek to last position if resuming
	if state.LastByteOffset > 0 {
		bm.log.Infof("Resuming from byte offset: %d", state.LastByteOffset)
		if _, err := file.Seek(state.LastByteOffset, 0); err != nil {
			return nil, fmt.Errorf("failed to seek: %w", err)
		}
	}

	// Create scanner for streaming
	scanner := bufio.NewScanner(file)
	const maxCapacity = 512 * 1024 // 512KB
	buf := make([]byte, maxCapacity)
	scanner.Buffer(buf, maxCapacity)

	// Initialize result
	result := &BackfillResult{
		ProcessedEvents: state.TotalEventsProcessed, // Start from existing count
	}

	// Batch processing
	if config.BatchSize == 0 {
		config.BatchSize = 100
	}
	batch := make([]*types.AgentEvent, 0, config.BatchSize)
	currentOffset := state.LastByteOffset
	lastProgressUpdate := time.Now()

	// Process lines
	lineNum := 0
	for scanner.Scan() {
		lineNum++
		line := scanner.Text()
		lineBytes := int64(len(line)) + 1 // +1 for newline

		// Check context cancellation
		select {
		case <-ctx.Done():
			// Save state before exiting
			state.LastByteOffset = currentOffset
			state.Status = StatusPaused
			bm.stateStore.Save(state)
			return result, ctx.Err()
		default:
		}

		// Parse event
		event, err := adapter.ParseLogLine(line)
		if err != nil {
			result.ErrorEvents++
			currentOffset += lineBytes
			continue
		}

		if event == nil {
			// Not a relevant event line
			currentOffset += lineBytes
			continue
		}

		result.TotalEvents++

		// Filter by date range
		if !config.FromDate.IsZero() && event.Timestamp.Before(config.FromDate) {
			currentOffset += lineBytes
			continue
		}
		if !config.ToDate.IsZero() && event.Timestamp.After(config.ToDate) {
			currentOffset += lineBytes
			continue
		}

		// Check for duplicate
		if bm.isDuplicate(event) {
			result.SkippedEvents++
			currentOffset += lineBytes
			continue
		}

		// Add to batch
		batch = append(batch, event)
		currentOffset += lineBytes

		// Process batch when full
		if len(batch) >= config.BatchSize {
			if !config.DryRun {
				if err := bm.processBatch(ctx, batch); err != nil {
					bm.log.Warnf("Failed to process batch: %v", err)
					result.ErrorEvents += len(batch)
				} else {
					result.ProcessedEvents += len(batch)
				}

				// Update state
				state.LastByteOffset = currentOffset
				state.TotalEventsProcessed = result.ProcessedEvents
				if event.Timestamp.After(time.Time{}) {
					state.LastTimestamp = &event.Timestamp
				}
				if err := bm.stateStore.Save(state); err != nil {
					bm.log.Warnf("Failed to save state: %v", err)
				}
			} else {
				result.ProcessedEvents += len(batch)
			}

			// Report progress
			if config.ProgressCB != nil && time.Since(lastProgressUpdate) > time.Second {
				progress := Progress{
					AgentName:       config.AgentName,
					FilePath:        filePath,
					BytesProcessed:  currentOffset,
					TotalBytes:      totalBytes,
					EventsProcessed: result.ProcessedEvents,
					Percentage:      float64(currentOffset) / float64(totalBytes) * 100,
				}
				config.ProgressCB(progress)
				lastProgressUpdate = time.Now()
			}

			// Clear batch
			batch = batch[:0]
		}
	}

	// Process remaining batch
	if len(batch) > 0 {
		if !config.DryRun {
			if err := bm.processBatch(ctx, batch); err != nil {
				bm.log.Warnf("Failed to process final batch: %v", err)
				result.ErrorEvents += len(batch)
			} else {
				result.ProcessedEvents += len(batch)
			}
		} else {
			result.ProcessedEvents += len(batch)
		}
	}

	// Check for scanner errors
	if err := scanner.Err(); err != nil {
		state.Status = StatusFailed
		state.ErrorMessage = err.Error()
		bm.stateStore.Save(state)
		return result, fmt.Errorf("scanner error: %w", err)
	}

	// Mark as completed
	now := time.Now()
	state.Status = StatusCompleted
	state.CompletedAt = &now
	state.LastByteOffset = currentOffset
	state.TotalEventsProcessed = result.ProcessedEvents
	result.BytesProcessed = currentOffset

	if err := bm.stateStore.Save(state); err != nil {
		bm.log.Warnf("Failed to save final state: %v", err)
	}

	return result, nil
}

// processBatch sends a batch of events to the client and buffer
func (bm *BackfillManager) processBatch(ctx context.Context, batch []*types.AgentEvent) error {
	for _, event := range batch {
		// Try to send immediately
		if err := bm.client.SendEvent(event); err != nil {
			// Buffer if send fails
			if err := bm.buffer.Store(event); err != nil {
				return fmt.Errorf("failed to buffer event: %w", err)
			}
		}
	}
	return nil
}

// isDuplicate checks if an event has already been processed
func (bm *BackfillManager) isDuplicate(event *types.AgentEvent) bool {
	// TODO: Implement actual duplicate detection using event hash
	// For now, return false (no deduplication)
	// In production, this should check against a hash index in the buffer
	return false
}

// eventHash creates a deterministic hash for an event
func eventHash(event *types.AgentEvent) string {
	data := fmt.Sprintf("%s:%s:%d:%v",
		event.AgentID,
		event.Type,
		event.Timestamp.Unix(),
		event.Data["requestId"],
	)
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

// Resume resumes an interrupted backfill operation
func (bm *BackfillManager) Resume(ctx context.Context, agentName string) (*BackfillResult, error) {
	// Load all paused/in-progress states for this agent
	states, err := bm.stateStore.ListByAgent(agentName)
	if err != nil {
		return nil, fmt.Errorf("failed to list states: %w", err)
	}

	var resumeState *BackfillState
	for _, state := range states {
		if state.Status == StatusPaused || state.Status == StatusInProgress {
			resumeState = state
			break
		}
	}

	if resumeState == nil {
		return nil, fmt.Errorf("no paused backfill found for agent: %s", agentName)
	}

	bm.log.Infof("Resuming backfill: %s", resumeState.LogFilePath)

	// Get adapter
	adapter, err := bm.registry.Get(agentName)
	if err != nil {
		return nil, fmt.Errorf("no adapter found: %w", err)
	}

	// Create config from state
	config := BackfillConfig{
		AgentName: agentName,
		LogPath:   resumeState.LogFilePath,
		BatchSize: 100,
	}

	// Resume processing
	return bm.backfillFile(ctx, config, adapter, resumeState.LogFilePath)
}

// Status returns the status of backfill operations for an agent
func (bm *BackfillManager) Status(agentName string) ([]*BackfillState, error) {
	return bm.stateStore.ListByAgent(agentName)
}

// Cancel cancels a running backfill operation
func (bm *BackfillManager) Cancel(agentName string) error {
	states, err := bm.stateStore.ListByAgent(agentName)
	if err != nil {
		return err
	}

	for _, state := range states {
		if state.Status == StatusInProgress {
			state.Status = StatusPaused
			if err := bm.stateStore.Save(state); err != nil {
				return err
			}
		}
	}

	return nil
}

// Close closes the backfill manager and cleans up resources
func (bm *BackfillManager) Close() error {
	return bm.stateStore.Close()
}

// isLogFile checks if a file is a log file
func isLogFile(path string) bool {
	ext := filepath.Ext(path)
	return ext == ".log" || ext == ".txt" || ext == ".json" || ext == ".jsonl" || ext == ".ndjson"
}
