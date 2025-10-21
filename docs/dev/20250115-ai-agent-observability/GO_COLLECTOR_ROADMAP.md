# Go Collector Implementation Roadmap

**Priority**: HIGH - Foundation for production data collection  
**Target**: Lightweight binary (~10-20MB) that runs on developer machines  
**Status**: Not Started (0%)

## Phase 0: Project Setup (Days 1-2)

### Day 1: Go Project Structure
- [ ] Create `packages/collector-go/` directory
- [ ] Initialize Go module: `go mod init github.com/codervisor/devlog/collector`
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
- [ ] Add initial dependencies:
  - `github.com/fsnotify/fsnotify` (file watching)
  - `github.com/mattn/go-sqlite3` (local buffer)
  - `github.com/sirupsen/logrus` (logging)
- [ ] Create basic `main.go` with CLI structure

### Day 2: Development Tooling
- [ ] Set up cross-compilation script (darwin/linux/windows)
- [ ] Create Makefile for common tasks (build, test, clean)
- [ ] Add `.gitignore` for Go binaries
- [ ] Set up GitHub Actions workflow for building binaries
- [ ] Create initial README with build instructions

## Phase 1: Core Infrastructure (Days 3-7)

### Day 3: Configuration System
- [ ] Create `internal/config/config.go`
- [ ] Define config structure (matches design doc)
- [ ] Implement config loading from `~/.devlog/collector.json`
- [ ] Add environment variable expansion support
- [ ] Implement config validation
- [ ] Add default values
- [ ] Write unit tests

### Day 4: Log Discovery
- [ ] Create `internal/watcher/discovery.go`
- [ ] Implement OS-specific log path detection:
  - [ ] GitHub Copilot paths (darwin/linux/windows)
  - [ ] Claude Code paths
  - [ ] Cursor paths
- [ ] Add glob pattern matching for version wildcards
- [ ] Implement path expansion (home dir, env vars)
- [ ] Write tests for each OS (mock filesystem)

### Day 5: File Watching
- [ ] Create `internal/watcher/watcher.go`
- [ ] Implement LogWatcher using fsnotify
- [ ] Add file change detection (write events)
- [ ] Handle file rotation
- [ ] Add graceful error handling
- [ ] Implement event buffering channel
- [ ] Write integration tests

### Days 6-7: Local Buffer (SQLite)
- [ ] Create `internal/buffer/buffer.go`
- [ ] Define SQLite schema (events table, metadata table)
- [ ] Implement Buffer initialization
- [ ] Add `Store(event)` method
- [ ] Add `GetUnsent(limit)` method
- [ ] Add `MarkSent(eventIDs)` method
- [ ] Implement size limit enforcement (cleanup old events)
- [ ] Add deduplication logic
- [ ] Write comprehensive tests
- [ ] Test offline mode behavior

## Phase 2: Adapter System (Days 8-12)

### Day 8: Base Adapter Infrastructure
- [ ] Create `internal/adapters/adapter.go` (interface definition)
- [ ] Create `internal/adapters/registry.go`
- [ ] Implement adapter registration
- [ ] Implement auto-detection logic (`CanHandle()`)
- [ ] Add adapter selection/routing
- [ ] Define standard event types (matches TypeScript types)
- [ ] Write base adapter tests

### Day 9: GitHub Copilot Adapter
- [ ] Create `internal/adapters/copilot.go`
- [ ] Research Copilot log format (collect samples)
- [ ] Implement `AgentID()` method
- [ ] Implement `CanHandle()` for Copilot detection
- [ ] Implement `ParseEvent()` with JSON parsing
- [ ] Map Copilot events to standard types:
  - completions → llm_response
  - edits → file_write
  - errors → error_encountered
- [ ] Handle Copilot-specific metadata
- [ ] Write tests with real log samples
- [ ] Document Copilot log format

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

### Day 13: HTTP Client
- [ ] Create `internal/client/client.go`
- [ ] Implement BackendClient struct
- [ ] Add connection pooling
- [ ] Add TLS/HTTPS support
- [ ] Implement authentication (Bearer token)
- [ ] Add request timeout configuration
- [ ] Write client unit tests

### Day 14: Batch Manager
- [ ] Create `internal/client/batch.go`
- [ ] Implement BatchManager
- [ ] Add event batching logic (100 events or 5s interval)
- [ ] Implement gzip compression
- [ ] Add batch size optimization
- [ ] Handle batch failures gracefully
- [ ] Write batching tests

### Day 15: Retry Logic
- [ ] Implement exponential backoff
- [ ] Add max retry limit
- [ ] Handle network failures
- [ ] Implement circuit breaker pattern
- [ ] Add retry statistics/metrics
- [ ] Test with unreliable network simulation

### Day 16: End-to-End Integration
- [ ] Wire all components together in `main.go`
- [ ] Implement graceful shutdown (SIGINT/SIGTERM)
- [ ] Add startup validation
- [ ] Test complete flow: watch → parse → buffer → send
- [ ] Test offline → online transition
- [ ] Performance profiling

## Phase 4: Distribution (Days 17-20)

### Day 17: Build System
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

- **Days 1-2**: Setup (10%)
- **Days 3-7**: Core Infrastructure (25%)
- **Days 8-12**: Adapters (25%)
- **Days 13-16**: Backend Communication (20%)
- **Days 17-20**: Distribution (20%)

**Total: ~20 days (4 weeks)** for production-ready collector

## Next Actions

1. Start with Day 1 setup
2. Get basic skeleton compiling and running
3. Implement one adapter (Copilot) end-to-end as proof of concept
4. Iterate based on learnings
