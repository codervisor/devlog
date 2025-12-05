---
status: planned
created: '2025-12-05'
tags:
  - ux
  - workflow
  - collector
  - sync
priority: high
created_at: '2025-12-05T04:55:09.494Z'
---

# Automatic Historical Data Synchronization

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-12-05

## Problem Statement

**Current UX is counter-intuitive:**
- User runs `devlog-collector start` expecting it to "just work"
- But historical data isn't captured - only new events are watched
- User must discover and run `devlog-collector backfill run --agent copilot --days 30`
- This is a manual, separate operation users don't expect

**What users expect (cloud-native mental model):**
- Install collector → Start collector → All data syncs automatically
- Like Dropbox, iCloud, or any modern sync service
- Historical + real-time data handled seamlessly as one concept

## Design

### Core Philosophy: Unified Sync Model

Replace the two separate concepts (backfill + watch) with a single **sync** concept:

```
┌─────────────────────────────────────────────────────────────┐
│                     UNIFIED SYNC                            │
├─────────────────────────────────────────────────────────────┤
│  1. On startup: Process all unsynced historical data        │
│  2. Continue: Watch for new events in real-time             │
│  3. Track: Remember what's been synced (cursor/watermark)   │
└─────────────────────────────────────────────────────────────┘
```

### State Management

Each log source maintains a **sync cursor** (stored in SQLite):

```go
type SyncState struct {
    AgentName      string     // "github-copilot"
    SourcePath     string     // "/path/to/chatSessions"
    LastSyncedAt   time.Time  // Timestamp of last synced event
    LastByteOffset int64      // Position in file (for resumption)
    LastEventHash  string     // Deduplication marker
    Status         string     // "synced", "syncing", "pending"
}
```

### Startup Flow (New Design)

```
devlog-collector start
    │
    ├── 1. Discover all agent log sources
    │
    ├── 2. For each source:
    │       ├── Load sync cursor from state DB
    │       ├── If cursor exists: Process only events after cursor
    │       └── If no cursor: Process all events (first sync)
    │
    ├── 3. Start real-time watcher
    │       └── Update cursor after each event batch
    │
    └── 4. Background: Periodically check for new log files
            └── New workspace opened → process its history too
```

### Configuration

```yaml
sync:
  # How far back to sync on first run (safety limit)
  initial_sync_days: 90
  
  # Whether to sync history at all (power users can disable)
  historical_sync: true
  
  # Batch size for initial sync (avoid overwhelming backend)
  sync_batch_size: 100
  
  # Sync in background vs blocking startup
  background_sync: true
```

### CLI Changes

**Before (confusing):**
```bash
devlog-collector start        # Only watches new events
devlog-collector backfill run # Separate manual step
```

**After (intuitive):**
```bash
devlog-collector start        # Syncs everything automatically
devlog-collector start --no-history  # Skip history (power users)
devlog-collector sync --status       # Check sync progress
```

**Deprecate but keep for compatibility:**
```bash
devlog-collector backfill run  # → Prints: "Deprecated. Use 'start' instead."
```

## Plan

### Phase 1: Merge Backfill into Start Command

- [ ] Add sync cursor management to BackfillManager
- [ ] Integrate historical sync into `start` command flow
- [ ] Process history before starting watcher (or in parallel)
- [ ] Add `--no-history` flag for power users

### Phase 2: Continuous Cursor Tracking

- [ ] Update cursor after each event batch (watcher and initial sync)
- [ ] Handle file rotation (new chat sessions)
- [ ] Detect new workspace directories dynamically

### Phase 3: Progress & Status UX

- [ ] Add `sync --status` subcommand
- [ ] Show sync progress on startup (non-blocking spinner/bar)
- [ ] Add sync state to `status` command output

### Phase 4: Cleanup & Documentation

- [ ] Deprecate `backfill` command (show migration message)
- [ ] Update README and help text
- [ ] Test full user journey from fresh install

## Test

- [ ] Fresh install: `start` syncs all history automatically
- [ ] Second start: Only syncs new events (cursor works)
- [ ] Interrupted sync: Resumes correctly
- [ ] New workspace opened: Its history syncs without restart
- [ ] `--no-history` skips historical sync
- [ ] Progress shows accurate % during initial sync

## Implementation Notes

### Minimal Changes Required

The good news: Most infrastructure already exists!

1. **BackfillManager** already handles historical parsing with state tracking
2. **Watcher** already handles real-time events
3. **StateStore** already persists progress

The main work is **orchestration** - calling backfill before/alongside watcher.

### Key Code Changes

```go
// cmd/devlog/main.go - start command

// Before watcher.Start():
if !skipHistory {
    log.Info("Syncing historical data...")
    bm, _ := backfill.NewBackfillManager(...)
    
    for agent, logs := range discovered {
        for _, logPath := range logs {
            // Process only unsynced events (cursor-based)
            bm.SyncToPresent(ctx, agent, logPath)
        }
    }
    log.Info("Historical sync complete")
}

// Then start watcher as normal
watcher.Start()
```

### Background Sync Option

For large histories, consider syncing in background:

```go
if cfg.Sync.BackgroundSync {
    go func() {
        bm.SyncToPresent(ctx, ...)
    }()
} else {
    bm.SyncToPresent(ctx, ...)  // Block until done
}
```

## Open Questions

1. **Initial sync limit**: Should we limit first sync to N days? (Proposed: 90 days)
2. **Progress display**: Spinner vs progress bar vs silent?
3. **Error handling**: Continue watcher if historical sync fails?

## Notes

### Prior Art

- **Dropbox/iCloud**: Sync is always on, no manual steps
- **Docker Desktop**: Background processes auto-start
- **VSCode Settings Sync**: Just enable and it works

### Mental Model Shift

| Old (Wrong) | New (Right) |
|-------------|-------------|
| "Backfill" = manual import | "Sync" = automatic, continuous |
| Two separate operations | One unified concept |
| User runs command | System handles everything |
