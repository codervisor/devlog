# Go Collector - Next Steps

**Current Status**: 65% Complete (Phase 1-3 Done)  
**Focus Areas**: Additional Adapters → Historical Backfill → Distribution

---

## 🎯 Immediate Next Tasks

### 1. Claude Code Adapter (Day 10) - Priority: HIGH

**Estimated Time**: 4-6 hours

**Steps**:

1. Research Claude Code log format
   - Location: Check discovery.go for paths
   - Find sample logs on your machine if Claude is installed
   - Document the JSON/text format
2. Create `internal/adapters/claude_adapter.go`
3. Implement AgentAdapter interface:

   ```go
   type ClaudeAdapter struct {
       *BaseAdapter
       sessionID string
   }

   func NewClaudeAdapter(projectID string) *ClaudeAdapter
   func (a *ClaudeAdapter) ParseLogLine(line string) (*types.AgentEvent, error)
   func (a *ClaudeAdapter) ParseLogFile(filePath string) ([]*types.AgentEvent, error)
   func (a *ClaudeAdapter) SupportsFormat(sample string) bool
   ```

4. Map Claude events to standard types:
   - Message requests → `EventTypeLLMRequest`
   - Message responses → `EventTypeLLMResponse`
   - Tool usage → `EventTypeToolUse`
   - File operations → `EventTypeFileRead/Write`
5. Write tests in `internal/adapters/claude_adapter_test.go`
6. Register in `registry.go`: `registry.Register(NewClaudeAdapter(projectID))`

**Reference**: Use `copilot_adapter.go` as template

---

### 2. Integration Testing with Real Backend (Manual) - Priority: HIGH

**Estimated Time**: 2-3 hours

**Prerequisites**:

- Backend API running (local or staging)
- Valid API key
- Sample agent logs available

**Test Scenarios**:

1. **Startup & Discovery**

   ```bash
   # Create config
   mkdir -p ~/.devlog
   cat > ~/.devlog/collector.json << EOF
   {
     "version": "1.0",
     "backendUrl": "http://localhost:3200",
     "apiKey": "test-key",
     "projectId": "test-project",
     "collection": {
       "batchSize": 10,
       "batchInterval": "5s"
     }
   }
   EOF

   # Start collector with verbose logging
   ./bin/devlog-collector start -v
   ```

2. **Real-time Collection**
   - Trigger AI agent activity (use Copilot/Claude)
   - Verify events appear in backend logs/database
   - Check event structure matches schema

3. **Offline Mode**
   - Stop backend
   - Trigger more agent activity
   - Verify events buffer to SQLite
   - Check buffer with: `sqlite3 ~/.devlog/buffer.db "SELECT COUNT(*) FROM events;"`
   - Restart backend
   - Verify buffered events flush automatically

4. **Error Handling**
   - Test with invalid API key
   - Test with unreachable backend
   - Verify graceful degradation

**Document Results**: Add findings to `GO_COLLECTOR_PROGRESS.md`

---

### 3. Cursor Adapter (Bonus) - Priority: MEDIUM

**Estimated Time**: 3-4 hours

Similar to Claude adapter but for Cursor logs:

1. Research Cursor log format
2. Create `internal/adapters/cursor_adapter.go`
3. Implement and test
4. Register in registry

---

## 🚀 Short-Term Goals (Next Week)

### 4. Historical Backfill Feature - Priority: CRITICAL

**Estimated Time**: 8-12 hours (Days 17-20)

**Why Critical**: Users can't get value without historical context

**Architecture**:

```go
// internal/backfill/backfill.go
type BackfillManager struct {
    registry   *adapters.Registry
    buffer     *buffer.Buffer
    client     *client.Client
    log        *logrus.Logger
}

type BackfillConfig struct {
    AgentName string
    LogPath   string
    FromDate  time.Time
    ToDate    time.Time
    DryRun    bool
}

func (bm *BackfillManager) Backfill(config BackfillConfig) (*BackfillResult, error)
```

**CLI Integration**:

```bash
# Add backfill subcommand
devlog-collector backfill --agent copilot --from 2025-10-01 --to 2025-10-30
devlog-collector backfill --agent claude --dry-run --from 2025-10-15

# Or as startup flag
devlog-collector start --backfill --backfill-days=7
```

**Key Challenges**:

1. **Timestamp tracking** - Prevent duplicate processing
2. **State persistence** - Resume after interruption
3. **Memory efficiency** - Handle large log files
4. **Progress reporting** - Show user feedback

**Implementation Plan**:

1. Create `internal/backfill/` package
2. Implement BackfillManager with date filtering
3. Add state tracking (SQLite table: backfill_state)
4. Add progress bar/logging
5. Add CLI commands
6. Test with large historical logs
7. Document usage

---

### 5. Generic Fallback Adapter - Priority: LOW

**Estimated Time**: 4-6 hours

For agents we don't explicitly support yet:

```go
// internal/adapters/generic_adapter.go
type GenericAdapter struct {
    *BaseAdapter
}

// Best-effort parsing
func (a *GenericAdapter) ParseLogLine(line string) (*types.AgentEvent, error) {
    // Try JSON parsing
    // Try common patterns (timestamps, keywords)
    // Extract basic info: timestamp, text content
}
```

---

## 📦 Medium-Term Goals (Next 2 Weeks)

### 6. NPM Package (Days 21-22) - Priority: HIGH

**Structure**:

```
packages/collector-npm/
├── package.json
├── bin/
│   ├── devlog-collector-darwin-amd64
│   ├── devlog-collector-darwin-arm64
│   ├── devlog-collector-linux-amd64
│   └── devlog-collector-windows-amd64.exe
└── scripts/
    ├── install.js
    └── postinstall.js
```

**package.json**:

```json
{
  "name": "@codervisor/devlog-collector",
  "version": "1.0.0",
  "bin": {
    "devlog-collector": "./bin/collector"
  },
  "scripts": {
    "postinstall": "node scripts/postinstall.js"
  }
}
```

**Install Script**: Detect platform and create symlink to correct binary

---

### 7. Auto-start Configuration (Day 23) - Priority: MEDIUM

**macOS (launchd)**:

```bash
# Create plist
~/Library/LaunchAgents/io.devlog.collector.plist

# Load
launchctl load ~/Library/LaunchAgents/io.devlog.collector.plist
```

**Linux (systemd)**:

```bash
# Create service
~/.config/systemd/user/devlog-collector.service

# Enable
systemctl --user enable devlog-collector
systemctl --user start devlog-collector
```

**Helper Commands**:

```bash
devlog-collector install-daemon  # Auto-create launch scripts
devlog-collector uninstall-daemon
```

---

### 8. Documentation (Day 24) - Priority: MEDIUM

**Docs to Create**:

1. **README.md** - Update with complete usage guide
2. **ARCHITECTURE.md** - System design and component overview
3. **ADAPTERS.md** - Guide for adding new adapters
4. **TROUBLESHOOTING.md** - Common issues and solutions
5. **CONFIGURATION.md** - All config options explained

---

## 🔍 Performance & Optimization

### 9. Performance Profiling - Priority: LOW

**When**: After backfill implementation

**Metrics to Measure**:

- CPU usage under load
- Memory usage over time
- Event processing throughput
- Disk I/O for buffer operations
- Network bandwidth consumption

**Tools**:

```bash
# CPU profiling
go test -cpuprofile=cpu.prof -bench=.
go tool pprof cpu.prof

# Memory profiling
go test -memprofile=mem.prof -bench=.
go tool pprof mem.prof

# Live profiling
go tool pprof http://localhost:6060/debug/pprof/profile
```

---

## 📋 Quick Reference

### Build Commands

```bash
make build              # Build for current platform
make build-all          # Cross-compile for all platforms
make test               # Run tests
make test-coverage      # Run tests with coverage report
make clean              # Clean build artifacts
make dev                # Run with live reload (air)
```

### Test Commands

```bash
go test ./...                                    # Run all tests
go test -v ./internal/adapters                   # Verbose test output
go test -cover ./...                             # Show coverage
go test -coverprofile=coverage.txt ./...         # Generate coverage file
go tool cover -html=coverage.txt                 # View coverage in browser
```

### Debug Commands

```bash
# Run with verbose logging
./bin/devlog-collector start -v

# Check buffer contents
sqlite3 ~/.devlog/buffer.db "SELECT * FROM events LIMIT 10;"

# Monitor log file
tail -f ~/.devlog/collector.log

# Check discovered logs
./bin/devlog-collector start -v 2>&1 | grep "Watching"
```

---

## 🎯 Success Criteria

### For Backfill Feature

- [ ] Can process 1000+ historical events without errors
- [ ] Resumes correctly after interruption
- [ ] No duplicate events sent to backend
- [ ] Clear progress reporting during execution
- [ ] Dry-run mode works correctly

### For Additional Adapters

- [ ] Claude adapter: 60%+ test coverage
- [ ] Cursor adapter: 60%+ test coverage
- [ ] Generic adapter: Basic parsing works for unknown formats
- [ ] All adapters registered and auto-detected

### For Distribution

- [ ] NPM package installs on macOS/Linux/Windows
- [ ] Correct binary selected for platform
- [ ] Auto-start scripts work on all platforms
- [ ] Documentation covers all common use cases

---

## 📞 Getting Help

**Codebase Questions**: Read these docs in order

1. `GO_COLLECTOR_PROGRESS.md` - Current state
2. `go-collector-design.md` - Architecture and design decisions
3. `GO_COLLECTOR_ROADMAP.md` - Full development plan

**Implementation Questions**: Check existing code

- Adapter example: `internal/adapters/copilot_adapter.go`
- Tests example: `internal/adapters/adapters_test.go`
- Integration: `cmd/collector/main.go`

**Design Decisions**: Refer to

- Design doc: `docs/dev/20251021-ai-agent-observability/go-collector-design.md`
- TypeScript reference: `packages/collector/` (for API compatibility)

---

**Remember**: The collector is 65% done. The foundation is solid. Focus on adapters and backfill to reach MVP! 🚀
