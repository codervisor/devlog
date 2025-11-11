# Go Collector Implementation Roadmap

**Priority**: HIGH - Foundation for production data collection  
**Target**: Lightweight binary (~10-20MB) that runs on developer machines  
**Status**: In Progress (65% - Phase 1-3 Complete, Phase 4-5 Remaining)

**Latest Achievement**: Core infrastructure complete with 70%+ average test coverage. File watching, buffer, adapters, and backend client fully implemented with integration tests passing.

## Phase 0: Project Setup (Days 1-2)

### Day 1: Go Project Structure ✅ COMPLETE

- [x] Create `packages/collector-go/` directory
- [x] Initialize Go module: `go mod init github.com/codervisor/devlog/collector`
- [ ] Set up project structure:
  ```
  packages/collector-go/
  ├── cmd/
  │   └── collector/
  │       └── main.go           # Entry point
  ├── internal/
  │   ├── adapters/             # Agent-specific parsers
  │   ├── buffer/               # SQLite offline storage
  │   ├── config/               # Configuration management
  │   ├── watcher/              # File system watching
  │   └── client/               # Backend HTTP/gRPC client
  ├── pkg/
  │   └── types/                # Public types/interfaces
  ├── go.mod
  ├── go.sum
  └── README.md
  ```
- [x] Add initial dependencies:
  - `github.com/fsnotify/fsnotify` (file watching)
  - `github.com/mattn/go-sqlite3` (local buffer)
  - `github.com/sirupsen/logrus` (logging)
  - `github.com/spf13/cobra` (CLI framework)
- [x] Create basic `main.go` with CLI structure

### Day 2: Development Tooling ✅ COMPLETE

- [x] Set up cross-compilation script (darwin/linux/windows)
- [x] Create Makefile for common tasks (build, test, clean)
- [x] Add `.gitignore` for Go binaries
- [x] Add `.air.toml` for live reload during development
- [x] Add `.golangci.yml` for linting configuration
- [ ] Set up GitHub Actions workflow for building binaries (deferred)
- [x] Create initial README with build instructions

## Phase 1: Core Infrastructure (Days 3-7)

### Day 3: Configuration System ✅ COMPLETE

- [x] Create `internal/config/config.go`
- [x] Define config structure (matches design doc)
- [x] Implement config loading from `~/.devlog/collector.json`
- [x] Add environment variable expansion support (`${VAR}` syntax)
- [x] Implement config validation
- [x] Add default values
- [x] Write unit tests (100% coverage)
- [x] Integrate config system into main CLI

### Day 4: Log Discovery ✅ COMPLETE

- [x] Create `internal/watcher/discovery.go`
- [x] Implement OS-specific log path detection:
  - [x] GitHub Copilot paths (darwin/linux/windows)
  - [x] Claude Code paths
  - [x] Cursor paths
  - [x] Cline paths (bonus)
  - [x] Aider paths (bonus)
- [x] Add glob pattern matching for version wildcards
- [x] Implement path expansion (home dir, env vars)
- [x] Write tests for each OS (85.5% coverage)
- [x] Test discovery on real system (found Cursor logs)

### Day 5: File Watching ✅ COMPLETE

- [x] Create `internal/watcher/watcher.go`
- [x] Implement LogWatcher using fsnotify
- [x] Add file change detection (write events)
- [x] Handle file rotation
- [x] Add graceful error handling
- [x] Implement event buffering channel
- [x] Write integration tests (74.7% coverage)

### Days 6-7: Local Buffer (SQLite) ✅ COMPLETE

- [x] Create `internal/buffer/buffer.go`
- [x] Define SQLite schema (events table)
- [x] Implement Buffer initialization
- [x] Add `Store(event)` method
- [x] Add `Retrieve(limit)` method (renamed from GetUnsent)
- [x] Add `Delete(eventIDs)` method (renamed from MarkSent)
- [x] Implement size limit enforcement (FIFO eviction)
- [x] Add statistics and vacuum methods
- [x] Write comprehensive tests (74.8% coverage)
- [x] Test offline mode behavior

## Phase 2: Adapter System (Days 8-12)

### Day 8: Base Adapter Infrastructure ✅ COMPLETE

- [x] Create `internal/adapters/adapter.go` (interface definition)
- [x] Create `internal/adapters/registry.go`
- [x] Implement adapter registration
- [x] Implement auto-detection logic (`SupportsFormat()`)
- [x] Add adapter selection/routing
- [x] Define standard event types in `pkg/types`
- [x] Write base adapter tests (68.5% coverage)

### Day 9: GitHub Copilot Adapter ✅ COMPLETE

- [x] Create `internal/adapters/copilot_adapter.go`
- [x] Research Copilot log format (JSON-based)
- [x] Implement `Name()` method
- [x] Implement `SupportsFormat()` for Copilot detection
- [x] Implement `ParseLogLine()` and `ParseLogFile()` with JSON parsing
- [x] Map Copilot events to standard types:
  - completions → llm_request/llm_response
- [x] Handle Copilot-specific metadata (model, tokens, duration)
- [x] Write tests with sample log lines
- [x] Documented in code comments

### Day 10: Claude Code Adapter

- [ ] Create `internal/adapters/claude.go`
- [ ] Research Claude Code log format
- [ ] Implement adapter methods
- [ ] Map Claude events to standard types
- [ ] Handle tool_use events
- [ ] Write tests with Claude log samples
- [ ] Document Claude log format

### Days 11-12: Generic Adapter + Testing

- [ ] Create `internal/adapters/generic.go` (fallback)
- [ ] Implement best-effort parsing for unknown formats
- [ ] Integration test with all adapters
- [ ] Test adapter registry with multiple agents
- [ ] Create adapter development guide
- [ ] Add logging for unsupported log formats

## Phase 3: Backend Communication (Days 13-16)

### Day 13: HTTP Client ✅ COMPLETE

- [x] Create `internal/client/client.go`
- [x] Implement Client struct with batching
- [x] Add connection pooling (via http.Client)
- [x] Add TLS/HTTPS support
- [x] Implement authentication (Bearer token)
- [x] Add request timeout configuration
- [x] Write client unit tests (75.7% coverage)

### Day 14: Batch Manager ✅ COMPLETE (Integrated into Client)

- [x] Batching integrated into `client.go` (no separate file needed)
- [x] Implement batch queue and auto-flush logic
- [x] Add event batching (configurable size/interval)
- [x] Batch size optimization
- [x] Handle batch failures gracefully
- [x] Write batching tests
- [ ] Implement gzip compression (deferred - not critical)

### Day 15: Retry Logic ✅ COMPLETE

- [x] Implement exponential backoff
- [x] Add max retry limit (configurable)
- [x] Handle network failures
- [x] Add retry logging and monitoring
- [x] Test with simulated failures
- [ ] Implement circuit breaker pattern (deferred - nice to have)

### Day 16: End-to-End Integration ✅ COMPLETE

- [x] Wire all components together in `cmd/collector/main.go`
- [x] Implement graceful shutdown (SIGINT/SIGTERM)
- [x] Add startup validation and health checks
- [x] Test complete flow: watch → parse → buffer → send
- [x] Implement buffered event flushing
- [x] CLI with start/version/status commands
- [ ] Test offline → online transition (manual testing needed)
- [ ] Performance profiling (deferred to optimization phase)

## Phase 4: Historical Log Collection (Days 17-20)

### Day 17: Backfill Architecture

- [ ] Design backfill data structures
- [ ] Add `BackfillManager` component
- [ ] Define timestamp tracking mechanism
- [ ] Implement deduplication logic (prevent re-processing)
- [ ] Add log file parsing from arbitrary position
- [ ] Design state persistence (last processed position)
- [ ] Write architecture documentation

### Day 18: Backfill Implementation

- [ ] Create `internal/backfill/` package
- [ ] Implement log file historical reading (from start/date)
- [ ] Add date range filtering for events
- [ ] Implement progress tracking and resumption
- [ ] Add dry-run mode (preview without sending)
- [ ] Handle log rotation during backfill
- [ ] Write comprehensive tests

### Day 19: Backfill CLI Integration

- [ ] Add `backfill` subcommand to CLI
- [ ] Add flags: `--agent`, `--from`, `--to`, `--dry-run`
- [ ] Add `--backfill` flag to `start` command
- [ ] Implement progress reporting
- [ ] Add statistics output (events found, sent, skipped)
- [ ] Test CLI with real historical logs
- [ ] Document backfill command usage

### Day 20: Backfill Testing & Validation

- [ ] Test with Copilot historical logs
- [ ] Test with Claude historical logs
- [ ] Test with Cursor historical logs
- [ ] Verify deduplication works correctly
- [ ] Test large backfill operations (>10K events)
- [ ] Validate timestamp accuracy
- [ ] Performance benchmarking

## Phase 5: Distribution (Days 21-24)

### Day 21: Build System

- [ ] Create cross-compilation script
- [ ] Build for all platforms:
  - darwin/amd64
  - darwin/arm64
  - linux/amd64
  - linux/arm64
  - windows/amd64
- [ ] Optimize binary size (strip symbols, UPX compression)
- [ ] Test binaries on each platform
- [ ] Measure binary sizes

### Day 18: NPM Package

- [ ] Create `packages/collector-npm/` directory
- [ ] Create `package.json` for `@codervisor/devlog-collector`
- [ ] Add post-install script
- [ ] Bundle platform-specific binaries
- [ ] Create platform detection logic
- [ ] Test npm install on all platforms
- [ ] Publish to npm (test registry first)

### Day 19: Auto-start Configuration

- [ ] Create macOS launchd plist template
- [ ] Create Linux systemd service template
- [ ] Create Windows service installer (optional)
- [ ] Add install script for auto-start setup
- [ ] Add uninstall script
- [ ] Test auto-start on each platform
- [ ] Document manual setup steps

### Day 20: Documentation

- [ ] Write comprehensive README
- [ ] Add installation guide
- [ ] Document configuration options
- [ ] Add troubleshooting section
- [ ] Create architecture diagram
- [ ] Document performance characteristics
- [ ] Add contribution guide for new adapters

## Testing Strategy

### Unit Tests

- [ ] All adapters (with real log samples)
- [ ] Buffer operations
- [ ] Config loading and validation
- [ ] Event parsing and transformation

### Integration Tests

- [ ] Full pipeline: watch → parse → buffer → send
- [ ] Multi-agent concurrent collection
- [ ] Offline mode and recovery
- [ ] Error handling and retry

### Performance Tests

- [ ] Measure event processing throughput
- [ ] Test with high-volume log generation
- [ ] Memory usage profiling
- [ ] CPU usage monitoring
- [ ] Battery impact assessment (macOS)

### Platform Tests

- [ ] macOS (Intel + Apple Silicon)
- [ ] Linux (Ubuntu, Fedora)
- [ ] Windows 10/11

## Success Criteria

- [ ] Binary size < 20MB (uncompressed)
- [ ] Memory usage < 50MB (typical)
- [ ] CPU usage < 1% (idle), < 5% (active)
- [ ] Event processing > 1K events/sec
- [ ] Startup time < 1 second
- [ ] Works offline, syncs when online
- [ ] Handles log rotation gracefully
- [ ] Historical log collection with deduplication
- [ ] Backfill performance > 500 events/sec
- [ ] Cross-platform compatibility verified
- [ ] NPM package installable and functional

## Risk Mitigation

### Technical Risks

- **Log format changes**: Adapters may break with agent updates
  - Mitigation: Version detection, graceful fallbacks, monitoring
- **Platform-specific issues**: File paths, permissions vary by OS
  - Mitigation: Extensive testing, clear error messages
- **Performance impact**: Collector shouldn't slow down development
  - Mitigation: Benchmarking, resource limits, efficient algorithms

### Operational Risks

- **User adoption**: Developers may resist installing collectors
  - Mitigation: Easy install (npm), clear value proposition, minimal footprint
- **Privacy concerns**: Developers may worry about data collection
  - Mitigation: Clear documentation, opt-in, local-first design, data controls

## Timeline Summary

- **Days 1-2**: Setup (8%)
- **Days 3-7**: Core Infrastructure (20%)
- **Days 8-12**: Adapters (20%)
- **Days 13-16**: Backend Communication (17%)
- **Days 17-20**: Historical Log Collection (17%)
- **Days 21-24**: Distribution (18%)

**Total: ~24 days (4.8 weeks)** for production-ready collector with backfill support

## Next Actions

1. Start with Day 1 setup
2. Get basic skeleton compiling and running
3. Implement one adapter (Copilot) end-to-end as proof of concept
4. Iterate based on learnings
