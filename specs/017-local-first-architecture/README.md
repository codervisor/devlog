---
status: planned
created: '2025-12-05'
tags:
  - architecture
  - collector
  - sync
  - storage
priority: medium
created_at: '2025-12-05T05:44:09.643Z'
depends_on:
  - 016-automatic-historical-sync
updated_at: '2025-12-05T05:44:09.651Z'
---

# Local-First Collector Architecture

> **Status**: 🗓️ Planned · **Priority**: Medium · **Created**: 2025-12-05 · **Depends on**: 016-automatic-historical-sync

## Problem Statement

Current architecture tries to send events directly to remote, buffering only on failure. This creates issues:

1. **Privacy**: All data goes to remote by default - no user control
2. **Offline**: Collection fails when network is unavailable  
3. **Single destination**: Can't route work → team server, personal → private
4. **No local querying**: Can't explore data before sharing

## Design

### Core Principle: Collect Local, Export Selective

Inspired by Fluent Bit, Vector, and OpenTelemetry patterns:

```
┌─────────────────────────────────────────────────────────────┐
│                     DEVLOG COLLECTOR                        │
├─────────────────────────────────────────────────────────────┤
│  LAYER 1: COLLECT (always on, all workspaces)               │
│    Agent Logs → Parser → Local SQLite                       │
│    • Works offline                                          │
│    • All data captured                                      │
│    • No remote dependency                                   │
├─────────────────────────────────────────────────────────────┤
│  LAYER 2: EXPORT (selective, multi-destination)             │
│    Local SQLite → Remote(s) based on routing rules          │
│    • Workspace pattern matching                             │
│    • Multiple remotes                                       │
│    • Auto-sync or manual                                    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Agent Logs                Local Store              Remote(s)
    │                          │                       │
    ▼                          ▼                       ▼
┌─────────┐              ┌──────────┐            ┌─────────┐
│ Copilot │──┐           │          │     ┌─────▶│ Team    │
│  Logs   │  │           │  SQLite  │     │      │ Server  │
└─────────┘  │  Parse    │  events  │ Export     └─────────┘
             ├──────────▶│   .db    │─────┤
┌─────────┐  │           │          │     │      ┌─────────┐
│ Claude  │──┤           │  Cursors │     └─────▶│Personal │
│  Logs   │  │           │  .db     │            │ Server  │
└─────────┘  │           └──────────┘            └─────────┘
             │                │
┌─────────┐  │                │ Query locally
│ Cursor  │──┘                ▼
│  Logs   │             ┌──────────┐
└─────────┘             │ devlog   │
                        │ query    │
                        └──────────┘
```

### Configuration Schema

```yaml
# ~/.devlog/config.yaml

collect:
  enabled: true
  agents: [copilot, claude, cursor]
  
storage:
  path: ~/.devlog/data/
  events_db: events.db
  cursors_db: cursors.db
  retention_days: 365

export:
  remotes:
    # Team remote - auto-sync work projects
    team:
      url: https://devlog.company.com
      api_key: ${DEVLOG_TEAM_API_KEY}
      auto_sync: true
      sync_interval: 30s
      workspaces:
        include:
          - "~/work/**"
          - "~/company/**"
        exclude:
          - "**/personal/**"
          - "**/scratch/**"
    
    # Personal remote - manual export only
    personal:
      url: https://my-devlog.io
      api_key: ${DEVLOG_PERSONAL_API_KEY}
      auto_sync: false
      workspaces:
        include:
          - "~/personal/**"
          - "~/side-projects/**"

# Default: collect everything, export nothing (opt-in)
# Or: collect everything, export to default remote (opt-out)
export_default: none  # or "team"
```

### Two Cursor Types

```go
// Collection cursor: "What have I parsed from log files?"
type CollectCursor struct {
    AgentName      string    // "github-copilot"
    SourcePath     string    // "/path/to/chatSessions/abc.json"
    LastByteOffset int64     // Resume position in file
    LastEventTime  time.Time // Latest event timestamp seen
}

// Export cursor: "What have I sent to remote X?"
type ExportCursor struct {
    RemoteName     string    // "team"
    LastEventID    string    // Last event ID sent
    LastExportTime time.Time // When last export happened
    Status         string    // "synced", "pending", "error"
}
```

This separation allows:
- Collection runs independently of export
- Add new remote later → backfill just that remote
- Remote down → collection continues, export retries

### CLI Commands

```bash
# Start collector (collection always runs)
devlog start

# Check local data
devlog query --workspace ~/work/myproject --last 7d
devlog stats --local

# Export commands
devlog export --remote team              # Manual export to team
devlog export --remote personal --all    # Export all matching events
devlog export --status                   # Show export status per remote

# Remote management  
devlog remote add personal https://my.devlog.io
devlog remote list
devlog remote test team                  # Test connectivity
```

## Plan

### Phase 1: Refactor Storage Layer

- [ ] Create `internal/storage/` package
- [ ] Move buffer.go logic to storage layer
- [ ] Add events table with workspace metadata
- [ ] Add collect_cursors table
- [ ] Add export_cursors table (per-remote)

### Phase 2: Decouple Collection from Export

- [ ] Collection writes to local SQLite only
- [ ] Remove direct client.SendEvent from collection path
- [ ] Add workspace path extraction to events
- [ ] Update BackfillManager to use new storage

### Phase 3: Export Manager

- [ ] Create `internal/export/` package
- [ ] Implement ExportManager with per-remote cursors
- [ ] Add workspace pattern matching (glob)
- [ ] Add background export goroutine
- [ ] Implement retry with exponential backoff

### Phase 4: Multi-Remote Configuration

- [ ] Extend config schema for multiple remotes
- [ ] Add remote management CLI commands
- [ ] Add `devlog export` CLI commands
- [ ] Add export status/progress reporting

### Phase 5: Local Query Support

- [ ] Add `devlog query` command
- [ ] Add `devlog stats --local` command
- [ ] Simple filtering by workspace, time range, event type

## Test

- [ ] Collection works with no network (airplane mode)
- [ ] Events stored locally with correct workspace metadata
- [ ] Export sends only matching workspaces per remote
- [ ] Add remote later → can backfill historical data
- [ ] Remote down → collection continues, export retries
- [ ] Multiple remotes receive correct filtered data
- [ ] `devlog query` returns local data correctly

## Notes

### Industry Patterns Applied

| Pattern | Source | How We Apply |
|---------|--------|--------------|
| Memory + disk buffer | Fluent Bit | SQLite as durable store |
| Fan-out to sinks | OTel, Vector | Multiple remotes |
| Tag-based routing | Fluent Bit | Workspace pattern matching |
| Cursor/checkpoint | All | Per-source + per-destination cursors |
| Backpressure handling | Fluent Bit | Local buffer absorbs spikes |

### Migration Path

From current architecture:
1. Spec 016 adds auto-sync (keep current single-remote)
2. This spec adds local-first + multi-remote
3. Existing users: seamless upgrade (local DB created automatically)
4. New users: opt-in to remotes (privacy by default)

### Open Questions

1. **Default behavior**: Collect all + export none (privacy) vs export to default remote?
2. **Query language**: Simple filters or full SQL access to local DB?
3. **Storage limits**: Auto-prune after N days, or let user manage?
4. **Encryption**: Encrypt local SQLite at rest?
