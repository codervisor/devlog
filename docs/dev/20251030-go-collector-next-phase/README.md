# Go Collector - Next Phase Implementation

**Created**: October 30, 2025  
**Status**: Planning  
**Current Progress**: 65% (Phase 1-3 Complete)  
**Target**: 95% (MVP Ready)

---

## 🎯 Objective

Complete the Go collector to MVP status by implementing:
1. Additional agent adapters (Claude, Cursor)
2. Historical log backfill capability
3. Distribution packaging (NPM)

---

## 📋 Implementation Tracking

### Phase 2 Completion: Additional Adapters

#### Task 1: Claude Code Adapter
**Priority**: HIGH  
**Estimated Time**: 4-6 hours  
**Status**: Not Started  
**Assignee**: TBD

**Requirements**:
- [ ] Research Claude Code log format
  - [ ] Locate log files using discovery paths
  - [ ] Collect sample log entries (5-10 examples)
  - [ ] Document JSON/text structure
- [ ] Create `internal/adapters/claude_adapter.go`
  - [ ] Implement `ClaudeAdapter` struct
  - [ ] Implement `ParseLogLine()` method
  - [ ] Implement `ParseLogFile()` method
  - [ ] Implement `SupportsFormat()` method
  - [ ] Map Claude events to standard types
- [ ] Create `internal/adapters/claude_adapter_test.go`
  - [ ] Test with sample log lines
  - [ ] Test format detection
  - [ ] Test edge cases (empty lines, malformed JSON)
  - [ ] Achieve 60%+ coverage
- [ ] Register adapter in `registry.go`
- [ ] Update documentation

**Event Type Mappings**:
- Claude message requests → `EventTypeLLMRequest`
- Claude message responses → `EventTypeLLMResponse`
- Tool usage → `EventTypeToolUse`
- File reads → `EventTypeFileRead`
- File writes → `EventTypeFileWrite`

**Reference Files**:
- Template: `internal/adapters/copilot_adapter.go`
- Tests: `internal/adapters/adapters_test.go`

**Acceptance Criteria**:
- [ ] Adapter parses Claude logs correctly
- [ ] Format detection works reliably
- [ ] Tests pass with 60%+ coverage
- [ ] Integration test succeeds

**Blockers**: None

**Notes**:
```bash
# Test locations for Claude logs
# macOS: ~/Library/Application Support/Claude/logs
# Linux: ~/.config/claude/logs
# Windows: %APPDATA%\Claude\logs
```

---

#### Task 2: Cursor Adapter
**Priority**: MEDIUM  
**Estimated Time**: 3-4 hours  
**Status**: Not Started  
**Assignee**: TBD  
**Depends On**: Task 1 complete (use as reference)

**Requirements**:
- [ ] Research Cursor log format
  - [ ] Locate log files
  - [ ] Collect sample log entries
  - [ ] Document structure
- [ ] Create `internal/adapters/cursor_adapter.go`
  - [ ] Implement adapter methods
  - [ ] Map Cursor events to standard types
- [ ] Create tests with 60%+ coverage
- [ ] Register adapter in `registry.go`

**Acceptance Criteria**:
- [ ] Adapter parses Cursor logs correctly
- [ ] Tests pass with 60%+ coverage
- [ ] Integration test succeeds

**Blockers**: None

---

#### Task 3: Generic Fallback Adapter
**Priority**: LOW  
**Estimated Time**: 4-6 hours  
**Status**: Not Started  
**Assignee**: TBD  
**Depends On**: Tasks 1-2 complete

**Requirements**:
- [ ] Design best-effort parsing strategy
- [ ] Create `internal/adapters/generic_adapter.go`
  - [ ] Try JSON parsing first
  - [ ] Extract basic info (timestamp, text)
  - [ ] Handle various formats gracefully
- [ ] Create tests
- [ ] Register as fallback adapter (lowest priority)
- [ ] Document limitations

**Acceptance Criteria**:
- [ ] Can extract basic info from unknown formats
- [ ] Doesn't crash on malformed input
- [ ] Tests cover common patterns

**Blockers**: None

---

### Phase 4: Historical Log Collection

#### Task 4: Backfill Architecture & Design
**Priority**: CRITICAL  
**Estimated Time**: 2-3 hours  
**Status**: Not Started  
**Assignee**: TBD

**Requirements**:
- [ ] Design BackfillManager architecture
- [ ] Design state tracking schema (SQLite table)
- [ ] Design CLI interface
- [ ] Design progress reporting mechanism
- [ ] Document deduplication strategy
- [ ] Create design document

**Deliverables**:
- [ ] Architecture diagram
- [ ] SQLite schema for backfill_state table
- [ ] CLI command specification
- [ ] Design doc: `backfill-design.md`

**Key Decisions Needed**:
1. State tracking: File-based or SQLite table?
2. Resumption: Store byte offset or timestamp?
3. Deduplication: Event ID hash or timestamp range?
4. Progress: Percentage or event count?

**Blockers**: None

---

#### Task 5: Backfill Core Implementation
**Priority**: CRITICAL  
**Estimated Time**: 6-8 hours  
**Status**: Not Started  
**Assignee**: TBD  
**Depends On**: Task 4 complete

**Requirements**:
- [ ] Create `internal/backfill/` package
- [ ] Create `internal/backfill/backfill.go`
  - [ ] Implement `BackfillManager` struct
  - [ ] Implement `Backfill(config)` method
  - [ ] Implement date range filtering
  - [ ] Implement state persistence
  - [ ] Implement resumption logic
  - [ ] Implement progress tracking
- [ ] Create `internal/backfill/state.go`
  - [ ] SQLite state tracking
  - [ ] Save/load last processed position
- [ ] Create `internal/backfill/backfill_test.go`
  - [ ] Test date range filtering
  - [ ] Test state persistence
  - [ ] Test resumption
  - [ ] Test large log files

**Code Structure**:
```go
// internal/backfill/backfill.go
type BackfillManager struct {
    registry   *adapters.Registry
    buffer     *buffer.Buffer
    client     *client.Client
    stateStore *StateStore
    log        *logrus.Logger
}

type BackfillConfig struct {
    AgentName string
    LogPath   string
    FromDate  time.Time
    ToDate    time.Time
    DryRun    bool
    BatchSize int
}

type BackfillResult struct {
    TotalEvents   int
    ProcessedEvents int
    SkippedEvents  int
    ErrorEvents    int
    Duration      time.Duration
}

func NewBackfillManager(config Config) (*BackfillManager, error)
func (bm *BackfillManager) Backfill(config BackfillConfig) (*BackfillResult, error)
func (bm *BackfillManager) Resume(agentName string) (*BackfillResult, error)
```

**Acceptance Criteria**:
- [ ] Can process 1000+ events without errors
- [ ] State persists correctly
- [ ] Resumes from last position after interruption
- [ ] No duplicate events generated
- [ ] Memory efficient (streams large files)
- [ ] Tests pass with 70%+ coverage

**Blockers**: None

---

#### Task 6: Backfill CLI Integration
**Priority**: CRITICAL  
**Estimated Time**: 3-4 hours  
**Status**: Not Started  
**Assignee**: TBD  
**Depends On**: Task 5 complete

**Requirements**:
- [ ] Add `backfill` subcommand to CLI
  - [ ] Add flags: `--agent`, `--from`, `--to`, `--dry-run`
  - [ ] Add progress bar/reporting
  - [ ] Add statistics output
- [ ] Add `--backfill` flag to `start` command
  - [ ] Auto-backfill on startup
  - [ ] Configurable lookback days
- [ ] Update help text and documentation
- [ ] Add examples to README

**CLI Commands**:
```bash
# Backfill specific agent
devlog-collector backfill --agent copilot --from 2025-10-01 --to 2025-10-30

# Dry run to preview
devlog-collector backfill --agent claude --from 2025-10-15 --dry-run

# Backfill all agents for last 7 days
devlog-collector backfill --from 2025-10-23

# Auto-backfill on startup
devlog-collector start --backfill --backfill-days=7
```

**Acceptance Criteria**:
- [ ] CLI commands work as documented
- [ ] Progress reporting is clear
- [ ] Statistics are accurate
- [ ] Error messages are helpful
- [ ] Help text is comprehensive

**Blockers**: None

---

#### Task 7: Backfill Testing & Validation
**Priority**: CRITICAL  
**Estimated Time**: 3-4 hours  
**Status**: Not Started  
**Assignee**: TBD  
**Depends On**: Task 6 complete

**Requirements**:
- [ ] Test with Copilot historical logs
- [ ] Test with Claude historical logs (if available)
- [ ] Test with large log files (>10K events)
- [ ] Test resumption after interruption
- [ ] Test deduplication
- [ ] Test error handling (corrupt logs, missing files)
- [ ] Performance benchmarking

**Test Scenarios**:
1. **Basic backfill**: Small log file, all events processed
2. **Date range**: Only events in range processed
3. **Large file**: 10K+ events, memory stays stable
4. **Interruption**: Kill process, resume successfully
5. **Duplicates**: Run twice, no duplicate events
6. **Corrupt logs**: Handles gracefully, continues processing

**Acceptance Criteria**:
- [ ] All test scenarios pass
- [ ] No memory leaks
- [ ] Performance: >500 events/sec
- [ ] Comprehensive error handling

**Blockers**: Need historical logs for testing

---

### Phase 5: Distribution & Deployment

#### Task 8: NPM Package Creation
**Priority**: HIGH  
**Estimated Time**: 4-6 hours  
**Status**: Not Started  
**Assignee**: TBD  
**Depends On**: Backfill complete (Tasks 4-7)

**Requirements**:
- [ ] Create `packages/collector-npm/` directory
- [ ] Create package.json
- [ ] Create postinstall script
  - [ ] Detect platform (darwin/linux/windows)
  - [ ] Detect architecture (amd64/arm64)
  - [ ] Select correct binary
  - [ ] Create symlink or copy
- [ ] Bundle all platform binaries
- [ ] Test on each platform
  - [ ] macOS (Intel + ARM)
  - [ ] Linux
  - [ ] Windows
- [ ] Publish to npm (test registry first)

**Package Structure**:
```
packages/collector-npm/
├── package.json
├── README.md
├── bin/
│   ├── devlog-collector-darwin-amd64
│   ├── devlog-collector-darwin-arm64
│   ├── devlog-collector-linux-amd64
│   └── devlog-collector-windows-amd64.exe
└── scripts/
    ├── postinstall.js
    └── uninstall.js
```

**Acceptance Criteria**:
- [ ] `npm install -g @codervisor/devlog-collector` works
- [ ] Correct binary selected for platform
- [ ] Binary is executable
- [ ] Works on all platforms

**Blockers**: Need npm organization access

---

#### Task 9: Auto-start Configuration
**Priority**: MEDIUM  
**Estimated Time**: 4-5 hours  
**Status**: Not Started  
**Assignee**: TBD  
**Depends On**: Task 8 complete

**Requirements**:
- [ ] Create macOS launchd plist template
- [ ] Create Linux systemd service template
- [ ] Create install-daemon command
- [ ] Create uninstall-daemon command
- [ ] Test auto-start on each platform
- [ ] Document setup process

**Commands**:
```bash
# Install daemon (auto-start on boot)
devlog-collector install-daemon

# Uninstall daemon
devlog-collector uninstall-daemon

# Check daemon status
devlog-collector daemon-status
```

**Acceptance Criteria**:
- [ ] Daemon starts on system boot
- [ ] Daemon restarts on failure
- [ ] Logs available for debugging
- [ ] Easy to install/uninstall

**Blockers**: None

---

#### Task 10: Documentation & Polish
**Priority**: MEDIUM  
**Estimated Time**: 3-4 hours  
**Status**: Not Started  
**Assignee**: TBD  
**Depends On**: All features complete

**Requirements**:
- [ ] Update main README.md
  - [ ] Installation instructions
  - [ ] Quick start guide
  - [ ] Configuration reference
  - [ ] Examples
- [ ] Create ARCHITECTURE.md
  - [ ] System design overview
  - [ ] Component descriptions
  - [ ] Data flow diagrams
- [ ] Create ADAPTERS.md
  - [ ] Guide for adding new adapters
  - [ ] Adapter interface documentation
  - [ ] Examples
- [ ] Create TROUBLESHOOTING.md
  - [ ] Common issues
  - [ ] Debug commands
  - [ ] FAQ
- [ ] Update CONTRIBUTING.md

**Acceptance Criteria**:
- [ ] Documentation is comprehensive
- [ ] Examples work correctly
- [ ] New users can get started easily

**Blockers**: None

---

## 📊 Progress Tracking

### Overall Status

```
Phase 2 (Adapters):       ██████████░░░░░░░░░░  50% → 100%
  └─ Task 1: Claude       ░░░░░░░░░░░░░░░░░░░░   0%
  └─ Task 2: Cursor       ░░░░░░░░░░░░░░░░░░░░   0%
  └─ Task 3: Generic      ░░░░░░░░░░░░░░░░░░░░   0%

Phase 4 (Backfill):       ░░░░░░░░░░░░░░░░░░░░   0% → 100%
  └─ Task 4: Design       ░░░░░░░░░░░░░░░░░░░░   0%
  └─ Task 5: Core         ░░░░░░░░░░░░░░░░░░░░   0%
  └─ Task 6: CLI          ░░░░░░░░░░░░░░░░░░░░   0%
  └─ Task 7: Testing      ░░░░░░░░░░░░░░░░░░░░   0%

Phase 5 (Distribution):   ░░░░░░░░░░░░░░░░░░░░   0% → 100%
  └─ Task 8: NPM          ░░░░░░░░░░░░░░░░░░░░   0%
  └─ Task 9: Auto-start   ░░░░░░░░░░░░░░░░░░░░   0%
  └─ Task 10: Docs        ░░░░░░░░░░░░░░░░░░░░   0%

Overall: 65% → 95% (MVP)
```

### Time Estimates

| Phase | Tasks | Hours | Status |
|-------|-------|-------|--------|
| Phase 2 | 3 | 11-16h | Not Started |
| Phase 4 | 4 | 14-19h | Not Started |
| Phase 5 | 3 | 11-15h | Not Started |
| **Total** | **10** | **36-50h** | **5-7 days** |

---

## 🎯 Milestones

### Milestone 1: Multi-Agent Support (Phase 2)
**Target Date**: November 3, 2025  
**Dependencies**: Tasks 1-3  
**Deliverables**:
- Claude adapter implemented and tested
- Cursor adapter implemented and tested
- Generic fallback adapter
- Registry updated

**Success Criteria**:
- [ ] All adapters have 60%+ test coverage
- [ ] Integration tests pass
- [ ] Documentation updated

---

### Milestone 2: Historical Collection (Phase 4)
**Target Date**: November 7, 2025  
**Dependencies**: Tasks 4-7  
**Deliverables**:
- Backfill manager implemented
- CLI commands working
- State tracking functional
- Comprehensive tests

**Success Criteria**:
- [ ] Can backfill 10K+ events
- [ ] Resumes correctly after interruption
- [ ] No duplicate events
- [ ] Performance: >500 events/sec
- [ ] Tests achieve 70%+ coverage

---

### Milestone 3: Production Ready (Phase 5)
**Target Date**: November 12, 2025  
**Dependencies**: Tasks 8-10  
**Deliverables**:
- NPM package published
- Auto-start scripts
- Complete documentation

**Success Criteria**:
- [ ] NPM package works on all platforms
- [ ] Auto-start setup is easy
- [ ] Documentation is comprehensive
- [ ] Ready for user adoption

---

## 🚀 Getting Started

### For Task 1 (Claude Adapter)
```bash
# 1. Find Claude logs
find ~/Library/Application\ Support/Claude/logs -name "*.log" 2>/dev/null
find ~/.config/claude/logs -name "*.log" 2>/dev/null

# 2. Copy sample logs to tmp/
mkdir -p tmp/claude-samples/
cp ~/Library/.../claude.log tmp/claude-samples/

# 3. Create adapter file
touch packages/collector-go/internal/adapters/claude_adapter.go
touch packages/collector-go/internal/adapters/claude_adapter_test.go

# 4. Run tests in watch mode
cd packages/collector-go
make dev
```

### For Task 4 (Backfill Design)
```bash
# 1. Create design doc
mkdir -p docs/dev/20251030-go-collector-next-phase
touch docs/dev/20251030-go-collector-next-phase/backfill-design.md

# 2. Review existing code
# - internal/watcher/watcher.go (file reading patterns)
# - internal/buffer/buffer.go (SQLite schema patterns)
# - cmd/collector/main.go (CLI patterns)

# 3. Design state schema
sqlite3 tmp/backfill-test.db
# CREATE TABLE backfill_state (...);
```

---

## 📝 Notes & Decisions

### Design Decisions Log

**Date**: 2025-10-30  
**Decision**: Use SQLite for backfill state tracking  
**Rationale**: Consistent with buffer implementation, reliable persistence  
**Alternatives Considered**: File-based JSON state  

---

## 🐛 Known Issues

None yet - will be tracked as development progresses

---

## 📞 Resources

### Documentation
- Main design: `docs/dev/20251021-ai-agent-observability/go-collector-design.md`
- Progress: `docs/dev/20251021-ai-agent-observability/GO_COLLECTOR_PROGRESS.md`
- Roadmap: `docs/dev/20251021-ai-agent-observability/GO_COLLECTOR_ROADMAP.md`

### Code References
- Copilot adapter: `packages/collector-go/internal/adapters/copilot_adapter.go`
- Main CLI: `packages/collector-go/cmd/collector/main.go`
- Buffer: `packages/collector-go/internal/buffer/buffer.go`

### External Resources
- fsnotify docs: https://pkg.go.dev/github.com/fsnotify/fsnotify
- SQLite docs: https://www.sqlite.org/docs.html
- Cobra CLI: https://github.com/spf13/cobra

---

**Last Updated**: October 30, 2025  
**Next Review**: After each milestone completion
