---
status: planned
created: '2025-12-05'
tags: [architecture, simplification, go, refactor]
priority: high
created_at: '2025-12-05T03:18:55.302Z'
---

# 014-core-simplification

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-12-05

## Overview

Reposition devlog as a **Go-only AI agent event collector and parser**. The current TypeScript/Node.js codebase has accumulated unnecessary complexity. Go provides the right foundation: single binary, low resource footprint, excellent concurrency for file watching and event streaming.

### Core Mission

A lightweight daemon that:

1. **Watches** AI coding tool log files (Copilot, Cursor, Claude, Windsurf, etc.)
2. **Parses** sessions and events into structured data
3. **Sends** events to configurable remote endpoints (agent-relay, custom backends)

### Why Go-Only?

- Single static binary - no Node.js/npm runtime dependencies
- Low memory footprint for always-on daemon
- Excellent file watching and concurrent I/O
- Already have `collector-go/` as foundation
- Matches agent-relay's Go backend

### What Gets Removed

- **All TypeScript packages** (`packages/*` except `collector-go`)
- **All Node.js tooling** (pnpm, turbo, vitest, etc.)
- **Web UI** (`apps/web/`)
- **Prisma/database layer** - events sent to remote, not stored locally

## Design

### Target Architecture

```
devlog (Go-only)
├── cmd/
│   └── devlog/           # Main binary entry point
├── internal/
│   ├── watcher/          # File system watching
│   ├── parser/           # Log parsing (Copilot, Cursor, Claude, etc.)
│   ├── events/           # Event types and serialization
│   └── sender/           # Remote event dispatch
├── pkg/                  # Public APIs if needed
└── configs/              # Default configurations
```

### Event Flow

```
[Log Files] → [Watcher] → [Parser] → [Events] → [Sender] → [Remote]
                                                              ↓
                                                    agent-relay / custom
```

### Configuration

```yaml
# ~/.config/devlog/config.yaml
watchers:
  - name: copilot
    path: ~/.config/github-copilot/logs/
    parser: copilot
  - name: cursor
    path: ~/.cursor/logs/
    parser: cursor

remote:
  endpoint: http://localhost:8080/api/events
  # or: ws://localhost:8080/ws/events
  auth_token: ${DEVLOG_TOKEN}
  batch_size: 100
  flush_interval: 5s
```

### Supported Parsers (Initial)

- GitHub Copilot
- Cursor
- Claude Code (Anthropic)
- Windsurf
- Generic JSON/JSONL

### Remote Integration

Events are POSTed or streamed via WebSocket to configurable endpoints:

- **agent-relay**: Native integration for session visualization
- **Custom backends**: Webhook-style event ingestion
- **stdout**: For piping to other tools

## Plan

- [ ] Phase 1: Audit `collector-go/` - identify reusable parsing logic
- [ ] Phase 2: Design event schema and remote API contract
- [ ] Phase 3: Implement core watcher → parser → sender pipeline
- [ ] Phase 4: Add parser support (Copilot, Cursor, Claude, Windsurf)
- [ ] Phase 5: Configuration and CLI interface
- [ ] Phase 6: Remove all TypeScript/Node.js code
- [ ] Phase 7: Update build/release (single binary, Docker image)
- [ ] Phase 8: Document agent-relay integration

## Test

- [ ] Daemon starts and watches configured paths
- [ ] Events parsed correctly for each supported tool
- [ ] Events sent to remote endpoint with retries
- [ ] Single binary works without external dependencies
- [ ] Configuration loading from file and env vars

## Notes

### Migration from TypeScript

| Current                  | Action                     |
| ------------------------ | -------------------------- |
| `packages/collector-go/` | Promote to root, expand    |
| `packages/collector/`    | Port parsing logic to Go   |
| `packages/core/`         | Port event types to Go     |
| `packages/ai/`           | Remove (not needed)        |
| `packages/cli/`          | Replace with Go CLI        |
| `packages/mcp/`          | Remove or separate project |
| `packages/shared/`       | Remove                     |
| `packages/web/`          | Remove                     |
| `apps/web/`              | Remove                     |
| `prisma/`                | Remove (no local DB)       |

### Event Schema (Draft)

```go
type Event struct {
    ID        string            `json:"id"`
    Type      string            `json:"type"`      // session_start, completion, error, etc.
    Source    string            `json:"source"`    // copilot, cursor, claude, etc.
    Timestamp time.Time         `json:"timestamp"`
    SessionID string            `json:"session_id,omitempty"`
    Data      map[string]any    `json:"data"`
}
```

### Open Questions

1. Should we embed agent-relay integration or keep it generic?
2. Local event buffering strategy when remote is unavailable?
3. Plugin system for custom parsers?
