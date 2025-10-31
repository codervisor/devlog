# Fix Collector Backfill Parsing Errors

**Status**: � In Progress  
**Created**: 2025-10-31  
**Spec**: `20251031/004-collector-parsing-errors`

## Overview

The Go collector's backfill functionality is failing to parse GitHub Copilot chat session log files, resulting in 447K+ parsing errors when processing historical logs. While the SQL timestamp scanning issue has been resolved, the event parsing logic is encountering errors that prevent successful backfill operations.

## Objectives

1. Identify root cause of 447K parsing errors in Copilot log backfill
2. Fix event parsing logic to correctly handle Copilot chat session format
3. Add verbose error logging for debugging
4. Successfully backfill historical Copilot activity

## Current Behavior

**Command**: `./bin/devlog-collector backfill run --days 1`

**Results**:
- Events processed: 0
- Errors: 447,397
- Data processed: 18.02 MB (but not successfully parsed)
- 11 log files discovered but not processed
- No error messages logged to stderr (silent failures)

**Log Files**:
- Location: `~/Library/Application Support/Code - Insiders/User/workspaceStorage/.../chatSessions/`
- Format: JSON chat session files (version 3)
- Size range: 511 bytes to 941 KB
- 11 files total

**Sample Log Structure**:
```json
{
  "version": 3,
  "requesterUsername": "tikazyq",
  "requesterAvatarIconUri": { "$mid": 1, ... },
  ...
}
```

## Design

### Fixed Issues ✅

1. **SQL Timestamp Scanning** - Fixed `started_at` column scanning from int64 to `time.Time`
   - File: `packages/collector-go/internal/backfill/state.go`
   - Changes: Added `sql.NullInt64` for `startedAt` in both `Load()` and `ListByAgent()` methods

2. **DefaultRegistry Arguments** - Added missing `hierarchyCache` and `logger` parameters
   - File: `packages/collector-go/cmd/collector/main.go`
   - Changes: Initialize `HierarchyCache` and pass to `DefaultRegistry()` calls

### Root Cause Analysis

The Copilot adapter (`packages/collector-go/internal/adapters/copilot_adapter.go`) likely expects:
- Line-delimited JSON logs (NDJSON format)
- Different schema than chat session format
- Specific event structure that doesn't match chat sessions

The chat session files are full session objects, not individual log events.

## Implementation Plan

### Phase 1: Investigation (High Priority)
- [ ] Add verbose error logging to backfill processor
- [ ] Capture and log first 10 parsing errors with sample data
- [ ] Examine `copilot_adapter.go` to understand expected format
- [ ] Compare expected vs actual log file format
- [ ] Determine if chat sessions are the correct log source

### Phase 2: Fix Parsing Logic
- [ ] Update parser to handle chat session format (if correct source)
- [ ] Or identify and use correct Copilot log files (if wrong source)
- [ ] Add format detection/validation
- [ ] Handle both session-level and event-level data

### Phase 3: Testing
- [ ] Test with sample chat session files
- [ ] Verify successful event extraction
- [ ] Test backfill with various date ranges
- [ ] Validate data sent to backend
- [ ] Test state persistence

## Files to Investigate

```
packages/collector-go/
├── internal/
│   ├── adapters/
│   │   ├── copilot_adapter.go       # Parsing logic
│   │   ├── claude_adapter.go
│   │   └── cursor_adapter.go
│   ├── backfill/
│   │   ├── backfill.go             # Error handling
│   │   └── state.go                # ✅ Fixed
│   └── watcher/
│       └── discovery.go            # Log file discovery
└── cmd/collector/main.go           # ✅ Fixed
```

## Success Criteria

- [ ] Zero parsing errors on valid log files
- [ ] Successfully extract events from Copilot chat sessions
- [ ] Error messages logged with actionable details
- [ ] Events successfully sent to backend
- [ ] Backfill state properly tracked
- [ ] Throughput > 0 events/sec

## Testing Commands

```bash
# Clean state and test backfill
rm -f ~/.devlog/buffer.db*
cd packages/collector-go
./bin/devlog-collector backfill run --days 1

# Check backfill status
./bin/devlog-collector backfill status

# Build collector
./build.sh

# Verbose mode (when implemented)
./bin/devlog-collector backfill run --days 1 --verbose
```

## References

- Fixed SQL scanning issue in `state.go` (Lines 95-136)
- Fixed DefaultRegistry calls in `main.go` (Lines 97, 327)
- Chat session log location: `~/Library/Application Support/Code - Insiders/User/workspaceStorage/.../chatSessions/`
