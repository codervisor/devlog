# Fix Collector Backfill Parsing Errors

**Status**: ✅ Complete  
**Created**: 2025-10-31  
**Completed**: 2025-10-31  
**Spec**: `20251031/004-collector-parsing-errors`

## Overview

The Go collector's backfill functionality was failing to parse GitHub Copilot chat session log files, resulting in 447K+ parsing errors. The root cause was identified and fixed: the backfill logic was attempting line-by-line parsing on JSON session files, when it should have been using file-based parsing.

## Objectives

1. Identify root cause of 447K parsing errors in Copilot log backfill
2. Fix event parsing logic to correctly handle Copilot chat session format
3. Add verbose error logging for debugging
4. Successfully backfill historical Copilot activity

## Root Cause

The backfill system (`packages/collector-go/internal/backfill/backfill.go`) was using **line-by-line parsing** for all log files:

```go
// Old code - tried to parse JSON session files line by line
for scanner.Scan() {
    event, err := adapter.ParseLogLine(line)  // ❌ Wrong for JSON files
    ...
}
```

However, **Copilot chat sessions are complete JSON files**, not line-delimited logs. The `CopilotAdapter.ParseLogLine()` explicitly returns an error:

```go
func (a *CopilotAdapter) ParseLogLine(line string) (*types.AgentEvent, error) {
    return nil, fmt.Errorf("line-based parsing not supported for Copilot chat sessions")
}
```

This caused every line (447,397 lines across all files) to fail parsing, though the errors were silently swallowed without logging.

### Additional Issues Fixed

1. **Nil Client in Hierarchy Cache** - The hierarchy cache was initialized with `nil` client before the API client was created, causing nil pointer dereference when trying to resolve workspace context.

2. **Silent Error Handling** - Parse errors were counted but never logged, making debugging impossible.

3. **Initialization Order** - Components were initialized in wrong order (hierarchy cache before API client).

## Solution

### 1. Dual-Mode Parsing (`backfill.go`)

Added logic to detect file format and use appropriate parsing method:

```go
// Determine parsing mode based on file extension and adapter
func (bm *BackfillManager) shouldUseFileParsing(adapter adapters.AgentAdapter, filePath string) bool {
    ext := filepath.Ext(filePath)
    adapterName := adapter.Name()
    
    // Copilot uses JSON session files - must use file parsing
    if adapterName == "github-copilot" && ext == ".json" {
        return true
    }
    
    // Other adapters with .jsonl or .ndjson use line parsing
    return false
}
```

Created two separate parsing paths:
- **`backfillFileWhole()`** - Parses entire file at once using `adapter.ParseLogFile()`
- **`backfillFileLineByLine()`** - Original line-by-line parsing for NDJSON formats

### 2. Error Logging

Added detailed error logging with sample data:

```go
// Log first N errors with sample data for debugging
if errorCount < maxErrorsToLog {
    sampleLine := line
    if len(sampleLine) > 200 {
        sampleLine = sampleLine[:200] + "..."
    }
    bm.log.Errorf("Parse error on line %d: %v | Sample: %s", lineNum, err, sampleLine)
}
```

### 3. Component Initialization Order (`main.go`)

Fixed initialization order in backfill command:

```go
// Before: ❌ Hierarchy cache before client
hiererchyCache := hierarchy.NewHierarchyCache(nil, log)  // nil client!
...
apiClient := client.NewClient(clientConfig)

// After: ✅ Client first, then hierarchy cache
apiClient := client.NewClient(clientConfig)
apiClient.Start()
hiererchyCache := hierarchy.NewHierarchyCache(apiClient, log)  // proper client
```

## Results

### Phase 1: Parsing Fix (Single Workspace)

**Before Fix:**
```bash
✓ Backfill completed
Duration: 78ms
Events processed: 0
Events skipped: 0
Errors: 447,397  ❌
Throughput: 0.0 events/sec
Data processed: 18.02 MB
```

**After Fix:**
```bash
✓ Backfill completed
Duration: 132ms
Events processed: 853  ✅
Events skipped: 0
Errors: 0  ✅
Throughput: 6,451.6 events/sec  ✅
Data processed: 18.02 MB
```

### Phase 2: Buffer Fix

**Issue:** Events were not being stored in SQLite buffer.

**Root Cause:** `SendEvent()` always returns `nil` (queues events internally), so the fallback to buffer never executed:
```go
// OLD - WRONG
if err := bm.client.SendEvent(event); err != nil {
    // Never executes because SendEvent() always returns nil!
    bm.buffer.Store(event)
}
```

**Solution:** Buffer first during backfill operations (historical data doesn't need real-time delivery):
```go
// NEW - CORRECT
// Buffer events first for reliable storage
if err := bm.buffer.Store(event); err != nil {
    bm.log.Warnf("Failed to buffer event: %v", err)
}
// Also try to send immediately (best effort)
bm.client.SendEvent(event)
```

**Result:** 
- ✅ **853 events buffered** in SQLite (was 0)
- ✅ Database size: 632KB
- ✅ Event types: llm_request, llm_response, file_read, file_modify, tool_use

### Phase 3: Multi-Workspace Support

**Issue:** Only processing logs from one workspace (current working directory).

**Enhancement:** Added flexible workspace selection with 3 modes:

1. **Single workspace** (default - backward compatible):
   ```bash
   ./bin/devlog-collector backfill run --days 365
   ```

2. **All workspaces** (new):
   ```bash
   ./bin/devlog-collector backfill run --days 365 --all-workspaces
   ```

3. **Specific workspaces** (new):
   ```bash
   ./bin/devlog-collector backfill run --days 365 --workspaces 487fd76a,d339d6b0
   ```

**Results from All Workspaces:**
```bash
✓ Backfill completed
Workspaces processed: 12
Duration: 24.8s
Events processed: 19,707  ✅ (23x more than single workspace!)
Events skipped: 1 (duplicates)
Errors: 243
Throughput: 795.1 events/sec
Data processed: 997.42 MB
```

- ✅ **12 workspaces processed** (out of 16 total, 12 have chat sessions)
- ✅ **19,707 events extracted** (vs 853 from single workspace)
- ✅ **10,000 events buffered** (hit buffer max_size limit)
- ⚠️ **243 parsing errors** (older log format with different CopilotVariable.value types)

**Event Type Breakdown:**
```
tool_use:       480 events
file_modify:    171 events
file_read:      130 events  
llm_response:    36 events
llm_request:     36 events
Total:          853 events (from first workspace)
```

**Average:** ~23.7 events per request (detailed activity tracking of tools, files, and LLM interactions)

## Files Modified

### Phase 1: Parsing Fix

1. **`packages/collector-go/internal/backfill/backfill.go`** (Major refactor)
   - Added `shouldUseFileParsing()` to detect file format
   - Split `backfillFile()` into two methods:
     - `backfillFileWhole()` - for JSON session files
     - `backfillFileLineByLine()` - for NDJSON/text logs
   - Added error logging with sample data (first 10 errors)
   - Improved progress tracking for both parsing modes

2. **`packages/collector-go/cmd/collector/main.go`** (Initialization order fix)
   - Moved API client initialization before hierarchy cache
   - Pass `apiClient` instead of `nil` to `NewHierarchyCache()`
   - Ensures hierarchy resolution works during backfill

### Phase 2: Buffer Fix

3. **`packages/collector-go/internal/backfill/backfill.go`** (`processBatch` fix)
   - Changed to buffer-first strategy for backfill operations
   - Ensures events are stored reliably in SQLite
   - Best-effort sending to backend (non-blocking)

### Phase 3: Multi-Workspace Support

4. **`packages/collector-go/cmd/collector/main.go`** (Multi-workspace support)
   - Added `--all-workspaces` flag to process all discovered workspaces
   - Added `--workspaces` flag to select specific workspace IDs
   - Modified discovery logic to return multiple paths
   - Aggregate results from multiple workspaces
   - Backward compatible (default processes single workspace)

## Testing

### Single Workspace (Default)
```bash
cd packages/collector-go
./build.sh
rm -f ~/.devlog/buffer.db*

./bin/devlog-collector-darwin-arm64 backfill run --days 365
# Result: 853 events from 11 files
```

### All Workspaces
```bash
./bin/devlog-collector-darwin-arm64 backfill run --days 365 --all-workspaces
# Result: 19,707 events from 12 workspaces
```

### Specific Workspaces
```bash
./bin/devlog-collector-darwin-arm64 backfill run --days 365 \
  --workspaces 487fd76abf5d5f8744f78317893cc477,d339d6b095ee421b12111ec2b1c33601
# Result: Events from specified workspaces only
```

### Verify Buffered Events
```bash
# Quick verification
sqlite3 ~/.devlog/buffer.db "SELECT COUNT(*) FROM events;"
sqlite3 ~/.devlog/buffer.db "SELECT agent_id, COUNT(*) FROM events GROUP BY agent_id;"

# Detailed verification (use provided script)
/tmp/verify_collector_db.sh

# Check backfill status
./bin/devlog-collector-darwin-arm64 backfill status --agent github-copilot
```

## Key Learnings

1. **Architecture Matters** - File format determines parsing strategy. Chat sessions ≠ log streams.

2. **Error Visibility** - Silent failures are debugging nightmares. Always log errors with context.

3. **Dependency Order** - Initialize dependencies before consumers (client before cache).

4. **Type Safety** - Go's interface system (`ParseLogLine` vs `ParseLogFile`) helped identify the mismatch.

5. **Async Complexity** - When `SendEvent()` queues asynchronously, errors aren't immediately visible. Buffer-first is safer for historical data.

6. **Scale Discovery** - Default single-workspace behavior masked the true scale (12 workspaces with 19K+ events). Always check what discovery finds.

## Next Steps

1. **Increase Buffer Size** - Current 10K limit fills quickly with multi-workspace backfill. Consider:
   - Configurable buffer size
   - Auto-flush when buffer reaches threshold
   - Buffer rotation/archival

2. **Fix Parsing Errors** - 243 errors from older Copilot log format:
   - `CopilotVariable.value` can be string, array, or map
   - Need flexible type handling or schema version detection

3. **Progress Tracking** - Better progress visibility for multi-workspace:
   - Per-workspace progress bars
   - ETA calculation
   - Pause/resume support

4. **Deduplication** - Currently placeholder (`isDuplicate()` returns false):
   - Implement content-based hashing
   - Store hashes in SQLite index
   - Prevent reprocessing on re-run

## Related Issues

- `packages/collector-go/internal/backfill/state.go` - Previously fixed SQL timestamp scanning
- `packages/collector-go/cmd/collector/main.go` - Previously fixed DefaultRegistry arguments
