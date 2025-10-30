# Historical Log Backfill - Design Document

**Created**: October 30, 2025  
**Status**: Design  
**Component**: Go Collector - Backfill Manager

---

## 1. Overview

The backfill feature enables processing of historical agent logs that were created before the collector started running. This is essential for capturing past development activity and providing a complete historical record.

### Goals
- Process historical log files from any date range
- Resume interrupted backfill operations
- Prevent duplicate events
- Handle large log files efficiently (streaming)
- Provide clear progress reporting

### Non-Goals
- Real-time log monitoring (handled by watcher)
- Log rotation or cleanup
- Data migration or transformation

---

## 2. Architecture

### 2.1 Component Structure

```
internal/backfill/
├── backfill.go       # Core BackfillManager
├── state.go          # SQLite state persistence
├── progress.go       # Progress tracking & reporting
└── backfill_test.go  # Comprehensive tests
```

### 2.2 Data Flow

```
┌─────────────┐
│   CLI       │
│  Command    │
└──────┬──────┘
       │
       ├── backfill --agent copilot --from 2025-10-01
       │
       v
┌──────────────┐
│  Backfill    │──┐
│   Manager    │  │ 1. Load state (last position)
└──────┬───────┘  │ 2. Open log file
       │          │ 3. Seek to position
       │          │ 4. Stream lines
       │          └ 5. Parse events
       │
       ├─────> Adapter Registry (detect format)
       │
       ├─────> Buffer (store events)
       │
       ├─────> Client (send to backend)
       │
       └─────> State Store (persist progress)
```

---

## 3. State Management

### 3.1 SQLite Schema

```sql
CREATE TABLE IF NOT EXISTS backfill_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_name TEXT NOT NULL,
    log_file_path TEXT NOT NULL,
    last_byte_offset INTEGER NOT NULL DEFAULT 0,
    last_timestamp INTEGER,
    total_events_processed INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'in_progress',
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    error_message TEXT,
    UNIQUE(agent_name, log_file_path)
);

CREATE INDEX IF NOT EXISTS idx_backfill_status 
    ON backfill_state(status);
CREATE INDEX IF NOT EXISTS idx_backfill_agent 
    ON backfill_state(agent_name);
```

### 3.2 State Transitions

```
[NEW] ──start──> [IN_PROGRESS] ──complete──> [COMPLETED]
                      │
                      └──error──> [FAILED]
                      │
                      └──pause──> [PAUSED] ──resume──> [IN_PROGRESS]
```

### 3.3 Resumption Strategy

- **Position Tracking**: Store byte offset in file
- **Recovery**: On restart, seek to last byte offset
- **Validation**: Skip already-processed events by checking event IDs in buffer

---

## 4. Deduplication Strategy

### 4.1 Event Identity

Events are identified by combination of:
- Agent ID
- Timestamp
- Event Type
- Key data fields (request ID, file path, etc.)

### 4.2 Deduplication Hash

```go
func eventHash(event *types.AgentEvent) string {
    data := fmt.Sprintf("%s:%s:%d:%s",
        event.AgentID,
        event.Type,
        event.Timestamp.Unix(),
        event.Data["requestId"], // adapter-specific key
    )
    hash := sha256.Sum256([]byte(data))
    return hex.EncodeToString(hash[:])
}
```

### 4.3 Duplicate Detection

```sql
-- Check if event hash exists before inserting
SELECT COUNT(*) FROM events 
WHERE event_hash = ? 
LIMIT 1
```

**Performance Note**: Add index on `event_hash` column in events table.

---

## 5. Implementation Details

### 5.1 BackfillManager Interface

```go
type BackfillManager struct {
    registry    *adapters.Registry
    buffer      *buffer.Buffer
    client      *client.Client
    stateStore  *StateStore
    log         *logrus.Logger
}

type BackfillConfig struct {
    AgentName   string        // e.g., "github-copilot"
    LogPath     string        // File or directory path
    FromDate    time.Time     // Start date (inclusive)
    ToDate      time.Time     // End date (inclusive)
    DryRun      bool          // Preview without processing
    BatchSize   int           // Events per batch
    ProgressCB  ProgressFunc  // Progress callback
}

type BackfillResult struct {
    TotalEvents      int
    ProcessedEvents  int
    SkippedEvents    int    // Duplicates
    ErrorEvents      int
    Duration         time.Duration
    BytesProcessed   int64
}

// Public API
func NewBackfillManager(config Config) (*BackfillManager, error)
func (bm *BackfillManager) Backfill(ctx context.Context, config BackfillConfig) (*BackfillResult, error)
func (bm *BackfillManager) Resume(ctx context.Context, agentName string) (*BackfillResult, error)
func (bm *BackfillManager) Status(agentName string) (*BackfillStatus, error)
func (bm *BackfillManager) Cancel(agentName string) error
func (bm *BackfillManager) Close() error
```

### 5.2 Progress Reporting

```go
type ProgressFunc func(progress Progress)

type Progress struct {
    AgentName       string
    FilePath        string
    BytesProcessed  int64
    TotalBytes      int64
    EventsProcessed int
    Percentage      float64
    EstimatedTime   time.Duration
}
```

### 5.3 Streaming Implementation

```go
func (bm *BackfillManager) processFile(ctx context.Context, config BackfillConfig) error {
    // 1. Load last position from state
    state, err := bm.stateStore.Load(config.AgentName, config.LogPath)
    
    // 2. Open file and seek to position
    file, err := os.Open(config.LogPath)
    defer file.Close()
    
    if state.LastByteOffset > 0 {
        file.Seek(state.LastByteOffset, 0)
    }
    
    // 3. Stream lines with buffering
    scanner := bufio.NewScanner(file)
    const maxCapacity = 512 * 1024 // 512KB lines
    buf := make([]byte, maxCapacity)
    scanner.Buffer(buf, maxCapacity)
    
    currentOffset := state.LastByteOffset
    batch := []*types.AgentEvent{}
    
    for scanner.Scan() {
        line := scanner.Text()
        currentOffset += int64(len(line)) + 1 // +1 for newline
        
        // Parse event
        event, err := adapter.ParseLogLine(line)
        if err != nil || event == nil {
            continue
        }
        
        // Filter by date range
        if !event.Timestamp.After(config.FromDate) || 
           !event.Timestamp.Before(config.ToDate) {
            continue
        }
        
        // Check for duplicate
        if bm.isDuplicate(event) {
            result.SkippedEvents++
            continue
        }
        
        batch = append(batch, event)
        
        // Process batch
        if len(batch) >= config.BatchSize {
            if err := bm.processBatch(ctx, batch); err != nil {
                return err
            }
            
            // Save progress
            bm.stateStore.Save(state.Update(currentOffset, len(batch)))
            
            batch = []*types.AgentEvent{}
        }
        
        // Check context cancellation
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
        }
    }
    
    // Process remaining batch
    if len(batch) > 0 {
        bm.processBatch(ctx, batch)
    }
    
    return scanner.Err()
}
```

---

## 6. CLI Interface

### 6.1 Commands

```bash
# Backfill specific agent and date range
devlog-collector backfill \
    --agent copilot \
    --from 2025-10-01 \
    --to 2025-10-30 \
    [--dry-run]

# Backfill all agents for last N days
devlog-collector backfill \
    --days 7

# Resume interrupted backfill
devlog-collector backfill resume --agent copilot

# Check backfill status
devlog-collector backfill status

# Cancel running backfill
devlog-collector backfill cancel --agent copilot

# Auto-backfill on collector start
devlog-collector start --backfill --backfill-days=7
```

### 6.2 Output Format

```
Backfilling copilot logs...
File: /path/to/copilot.log (2.5 MB)
Date Range: 2025-10-01 to 2025-10-30

Progress: [████████████░░░░░░░░] 60% (1500 KB / 2500 KB)
Events: 1,245 processed, 23 duplicates, 2 errors
Estimated: 2m 30s remaining

✓ Backfill completed
Total Events: 2,078
Duration: 6m 15s
Throughput: 5.5 events/sec
```

---

## 7. Error Handling

### 7.1 Error Categories

| Error Type | Strategy | Recovery |
|-----------|----------|----------|
| File not found | Fail fast | User must provide valid path |
| Permission denied | Fail fast | User must fix permissions |
| Corrupt log line | Skip & log | Continue processing |
| Network error | Retry | Buffer locally, retry later |
| Context canceled | Save state | Resume from last position |
| Disk full | Fail | User must free space |

### 7.2 Retry Policy

```go
type RetryConfig struct {
    MaxRetries  int           // Default: 3
    InitialDelay time.Duration // Default: 1s
    MaxDelay    time.Duration // Default: 30s
    Multiplier  float64       // Default: 2.0
}
```

---

## 8. Performance Considerations

### 8.1 Targets

- **Throughput**: >500 events/sec
- **Memory**: <100 MB for 10K+ events
- **Latency**: Progress update every 1 second

### 8.2 Optimizations

1. **Streaming**: Use `bufio.Scanner` to avoid loading entire file
2. **Batching**: Process events in batches of 100-500
3. **Indexing**: Add index on `event_hash` for fast duplicate detection
4. **Progress**: Update state every batch, not every event
5. **Parallelization**: Process multiple log files concurrently (future)

### 8.3 Memory Profile

```
Component          | Memory Usage
-------------------|-------------
Scanner Buffer     | 512 KB
Event Batch        | ~50 KB (100 events)
SQLite Connection  | ~1 MB
Total Estimate     | ~2-5 MB
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

- State persistence (save/load/update)
- Event deduplication hash
- Date range filtering
- Progress calculation
- Error handling

### 9.2 Integration Tests

```go
func TestBackfillManager_FullWorkflow(t *testing.T) {
    // Create test log file with 1000 events
    logFile := createTestLogFile(1000)
    
    // Run backfill
    result, err := manager.Backfill(ctx, config)
    assert.NoError(t, err)
    assert.Equal(t, 1000, result.ProcessedEvents)
    
    // Verify events in buffer
    count, _ := buffer.Count()
    assert.Equal(t, 1000, count)
    
    // Run again - should skip duplicates
    result2, _ := manager.Backfill(ctx, config)
    assert.Equal(t, 1000, result2.SkippedEvents)
}

func TestBackfillManager_Resumption(t *testing.T) {
    // Start backfill
    ctx, cancel := context.WithCancel(context.Background())
    
    go func() {
        time.Sleep(100 * time.Millisecond)
        cancel() // Interrupt
    }()
    
    manager.Backfill(ctx, config)
    
    // Resume
    result, _ := manager.Resume(context.Background(), "copilot")
    assert.Greater(t, result.ProcessedEvents, 0)
}
```

### 9.3 Performance Tests

```bash
# Generate large test log
./scripts/generate-test-logs.sh --events 10000 --output test.log

# Benchmark backfill
go test -bench=BenchmarkBackfill -benchmem
```

---

## 10. Future Enhancements

### Phase 2+ Features (Not in MVP)

1. **Parallel Processing**: Process multiple log files concurrently
2. **Log Rotation Handling**: Automatically detect rotated logs (`.1`, `.gz`)
3. **Incremental Sync**: Continuous backfill mode (like `tail -f`)
4. **Smart Detection**: Auto-detect date range from log file
5. **Compression Support**: Parse `.gz`, `.zip` log files
6. **Filtering**: Advanced filters (file paths, event types)
7. **Dry-run Summary**: Detailed preview before actual processing

---

## 11. Decision Log

### Decision 1: State Storage
**Date**: 2025-10-30  
**Decision**: Use SQLite for state persistence  
**Rationale**: 
- Consistent with buffer implementation
- ACID properties for reliable resumption
- Efficient queries for duplicate detection
- Low operational overhead

**Alternatives Considered**:
- JSON file: Simpler but lacks ACID, inefficient for large datasets
- In-memory: Fast but loses state on crash

### Decision 2: Position Tracking
**Date**: 2025-10-30  
**Decision**: Track byte offset instead of line number  
**Rationale**:
- More precise resumption
- Works with any line length
- Standard approach in log processing

### Decision 3: Deduplication Method
**Date**: 2025-10-30  
**Decision**: Hash-based deduplication with event_hash field  
**Rationale**:
- Fast lookups with index
- Deterministic (same event = same hash)
- Scales to millions of events

---

## 12. References

### Internal Docs
- [Go Collector Design](../20251021-ai-agent-observability/go-collector-design.md)
- [Implementation Roadmap](README.md)

### External Resources
- [bufio.Scanner docs](https://pkg.go.dev/bufio#Scanner)
- [SQLite performance](https://www.sqlite.org/fasterthanfs.html)
- [Context cancellation patterns](https://go.dev/blog/context)

---

**Last Updated**: October 30, 2025  
**Next Steps**: Begin implementation of `internal/backfill/backfill.go`
