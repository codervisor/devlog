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

### Before Fix
```bash
✓ Backfill completed
Duration: 78ms
Events processed: 0
Events skipped: 0
Errors: 447,397  ❌
Throughput: 0.0 events/sec
Data processed: 18.02 MB
```

### After Fix
```bash
✓ Backfill completed
Duration: 132ms
Events processed: 853  ✅
Events skipped: 0
Errors: 0  ✅
Throughput: 6,451.6 events/sec  ✅
Data processed: 18.02 MB

Log output showing successful parsing:
INFO: Parsed 31 events from 0ff791c0-4cc3-4eaa-91c9-c265a9a90c15.json
INFO: Parsed 16 events from 3b973629-fbcc-4167-9038-e8219c54c2f5.json
INFO: Parsed 267 events from 5c0f791b-c9ca-4e4f-8f79-462c5862be18.json
INFO: Parsed 151 events from a637b87a-57d5-45aa-b955-bf598badb9ba.json
INFO: Parsed 245 events from e9338204-6692-4e09-8861-8ea24fe696d9.json
... (11 files total)
```

### Key Improvements
- ✅ **100% success rate** - 0 errors (down from 447K)
- ✅ **853 events extracted** from 11 chat session files  
- ✅ **6,451 events/sec** throughput
- ✅ **Proper error logging** for debugging
- ✅ **Hierarchy context resolution** (when backend available)

## Files Modified

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

## Testing

```bash
# Clean state and run backfill
cd packages/collector-go
./build.sh
rm -f ~/.devlog/buffer.db*

# Test with 365 days to capture all events
./bin/devlog-collector-darwin-arm64 backfill run --days 365

# Check backfill status
./bin/devlog-collector-darwin-arm64 backfill status --agent github-copilot
```

## Key Learnings

1. **Architecture Matters** - File format determines parsing strategy. Chat sessions ≠ log streams.

2. **Error Visibility** - Silent failures are debugging nightmares. Always log errors with context.

3. **Dependency Order** - Initialize dependencies before consumers (client before cache).

4. **Type Safety** - Go's interface system (`ParseLogLine` vs `ParseLogFile`) helped identify the mismatch.

## Related Issues

- `packages/collector-go/internal/backfill/state.go` - Previously fixed SQL timestamp scanning
- `packages/collector-go/cmd/collector/main.go` - Previously fixed DefaultRegistry arguments
