# Week 2: Collector Implementation

**Timeline**: November 9-15, 2025  
**Focus**: Complete collector with all adapters + hierarchy integration  
**Status**: 📋 Planned  

---

## 🎯 Objectives

1. Integrate hierarchy resolution into Copilot adapter
2. Implement Claude and Cursor adapters
3. Update backfill system with hierarchy support
4. Production testing with real data

---

## 📅 Daily Plan

### Day 1-2: Copilot Adapter Integration

**Time**: 2 days (16 hours)  
**Status**: 85% complete, needs hierarchy integration

#### Tasks

- [ ] **Integrate Hierarchy Resolution** (4 hours)
  ```go
  // internal/adapters/copilot_adapter.go
  
  type CopilotAdapter struct {
      registry  *adapters.Registry
      hierarchy *hierarchy.HierarchyCache
      log       *logrus.Logger
  }
  
  func (ca *CopilotAdapter) ParseLogFile(path string) ([]AgentEvent, error) {
      // 1. Extract workspace ID from file path
      // Path: .../workspaceStorage/{workspace-id}/chatSessions/{session-id}.json
      workspaceID := extractWorkspaceIDFromPath(path)
      
      // 2. Resolve hierarchy
      ctx, err := ca.hierarchy.Resolve(workspaceID)
      if err != nil {
          ca.log.Warnf("Failed to resolve workspace %s: %v", workspaceID, err)
          return nil, fmt.Errorf("workspace not found: %w", err)
      }
      
      // 3. Parse chat session file (existing logic)
      events := ca.parseChatSession(path)
      
      // 4. Add hierarchy context to all events
      for i := range events {
          events[i].ProjectID = ctx.ProjectID
          events[i].MachineID = ctx.MachineID
          events[i].WorkspaceID = ctx.WorkspaceID
          
          // Add to context for querying
          events[i].Context["projectName"] = ctx.ProjectName
          events[i].Context["machineName"] = ctx.MachineName
      }
      
      return events, nil
  }
  ```

- [ ] **Handle Missing Workspaces** (3 hours)
  - Graceful degradation when workspace not found
  - Attempt on-the-fly registration
  - Log warnings but don't fail completely
  - Add metrics for unresolved workspaces

- [ ] **Update Event Structure** (2 hours)
  ```go
  type AgentEvent struct {
      ID        string    `json:"id"`
      Timestamp time.Time `json:"timestamp"`
      EventType string    `json:"eventType"`
      
      // Hierarchy context (NEW)
      SessionID   string `json:"sessionId"`   // Chat session UUID
      ProjectID   int    `json:"projectId"`   // Resolved project
      MachineID   int    `json:"machineId"`   // Current machine
      WorkspaceID int    `json:"workspaceId"` // VS Code workspace
      
      // Existing fields
      AgentID      string          `json:"agentId"`
      AgentVersion string          `json:"agentVersion"`
      Context      json.RawMessage `json:"context"`
      Data         json.RawMessage `json:"data"`
      Metrics      json.RawMessage `json:"metrics,omitempty"`
  }
  ```

- [ ] **Production Testing** (7 hours)
  - Process 657 real chat session files
  - Verify all events have hierarchy context
  - Check database for proper relationships
  - Verify no orphaned events
  - Performance benchmarking
  - Memory profiling

#### Success Criteria

- ✅ All events include hierarchy IDs
- ✅ No orphaned events (missing relationships)
- ✅ 844+ events processed successfully
- ✅ Database queries work correctly
- ✅ Performance: >500 events/sec
- ✅ Memory usage stable

---

### Day 3-4: Claude Adapter Implementation

**Time**: 2 days (16 hours)  
**Priority**: HIGH - Multi-agent support

#### Tasks

- [ ] **Research Claude Log Format** (3 hours)
  - Find Claude Desktop log location
  - Collect sample logs (10+ files)
  - Document JSON structure
  - Identify event types

- [ ] **Implement Claude Adapter** (8 hours)
  ```go
  // internal/adapters/claude_adapter.go
  
  type ClaudeAdapter struct {
      registry  *adapters.Registry
      hierarchy *hierarchy.HierarchyCache
      log       *logrus.Logger
  }
  
  func (ca *ClaudeAdapter) ParseLogFile(path string) ([]AgentEvent, error) {
      // 1. Extract workspace ID
      workspaceID := extractWorkspaceIDFromPath(path)
      
      // 2. Resolve hierarchy
      ctx, err := ca.hierarchy.Resolve(workspaceID)
      if err != nil {
          return nil, fmt.Errorf("failed to resolve hierarchy: %w", err)
      }
      
      // 3. Parse Claude format
      file, _ := os.Open(path)
      defer file.Close()
      
      var events []AgentEvent
      scanner := bufio.NewScanner(file)
      
      for scanner.Scan() {
          line := scanner.Text()
          event, err := ca.parseClaudeLine(line, ctx)
          if err != nil {
              ca.log.Debugf("Failed to parse line: %v", err)
              continue
          }
          events = append(events, event)
      }
      
      return events, nil
  }
  
  func (ca *ClaudeAdapter) parseClaudeLine(line string, ctx *hierarchy.WorkspaceContext) (AgentEvent, error) {
      // Parse Claude-specific JSON format
      var raw map[string]interface{}
      if err := json.Unmarshal([]byte(line), &raw); err != nil {
          return AgentEvent{}, err
      }
      
      // Extract event type
      eventType := ca.detectEventType(raw)
      
      // Map to standard event structure
      event := AgentEvent{
          ID:          uuid.New().String(),
          Timestamp:   parseTimestamp(raw["timestamp"]),
          EventType:   eventType,
          AgentID:     "claude",
          ProjectID:   ctx.ProjectID,
          MachineID:   ctx.MachineID,
          WorkspaceID: ctx.WorkspaceID,
          Context:     extractContext(raw),
          Data:        extractData(raw),
          Metrics:     extractMetrics(raw),
      }
      
      return event, nil
  }
  
  func (ca *ClaudeAdapter) detectEventType(raw map[string]interface{}) string {
      // Map Claude events to standard types
      if raw["type"] == "message_request" {
          return "llm_request"
      }
      if raw["type"] == "message_response" {
          return "llm_response"
      }
      if raw["type"] == "tool_use" {
          return "tool_use"
      }
      // ... more mappings
      return "unknown"
  }
  
  func (ca *ClaudeAdapter) SupportsFormat(path string) bool {
      // Check if file is Claude format
      return strings.Contains(path, "Claude") || 
             strings.Contains(path, "claude")
  }
  ```

- [ ] **Write Comprehensive Tests** (4 hours)
  - Unit tests with sample data
  - Test format detection
  - Test event type mapping
  - Test error handling
  - Integration tests

- [ ] **Register Adapter** (1 hour)
  ```go
  // internal/adapters/registry.go
  
  func NewRegistry(hierarchy *hierarchy.HierarchyCache) *Registry {
      registry := &Registry{
          adapters: make(map[string]Adapter),
      }
      
      // Register all adapters
      registry.Register("copilot", NewCopilotAdapter(registry, hierarchy))
      registry.Register("claude", NewClaudeAdapter(registry, hierarchy))
      
      return registry
  }
  ```

#### Success Criteria

- ✅ Claude logs parsed correctly
- ✅ Event types mapped accurately
- ✅ Hierarchy context included
- ✅ Tests pass with 70%+ coverage
- ✅ Format detection works
- ✅ No performance regressions

---

### Day 5: Cursor Adapter Implementation

**Time**: 1 day (8 hours)  
**Priority**: MEDIUM

#### Tasks

- [ ] **Research Cursor Log Format** (2 hours)
  - Similar process to Claude
  - Document structure

- [ ] **Implement Cursor Adapter** (4 hours)
  - Similar structure to Claude adapter
  - Parse Cursor-specific format
  - Map event types
  - Integrate hierarchy

- [ ] **Testing** (2 hours)
  - Unit tests
  - Integration tests
  - Test coverage >70%

#### Success Criteria

- ✅ Cursor logs parsed correctly
- ✅ Tests pass
- ✅ Hierarchy integration works

---

### Day 6: Backfill System Update

**Time**: 1 day (8 hours)  
**Status**: Core complete, needs hierarchy integration

#### Tasks

- [ ] **Update Backfill Manager** (4 hours)
  ```go
  // internal/backfill/backfill.go
  
  type BackfillManager struct {
      registry   *adapters.Registry
      buffer     *buffer.Buffer
      client     *client.Client
      hierarchy  *hierarchy.HierarchyCache
      stateStore *StateStore
      log        *logrus.Logger
  }
  
  func (bm *BackfillManager) Backfill(config BackfillConfig) (*BackfillResult, error) {
      // 1. Refresh hierarchy cache
      if err := bm.hierarchy.Refresh(); err != nil {
          return nil, fmt.Errorf("failed to refresh hierarchy: %w", err)
      }
      
      // 2. Find log files
      files, err := bm.findLogFiles(config.LogPath, config.FromDate, config.ToDate)
      if err != nil {
          return nil, err
      }
      
      result := &BackfillResult{
          TotalFiles: len(files),
      }
      
      // 3. Process each file
      for _, file := range files {
          // Extract workspace ID
          workspaceID := extractWorkspaceIDFromPath(file)
          
          // Check if workspace is known
          _, err := bm.hierarchy.Resolve(workspaceID)
          if err != nil {
              bm.log.Warnf("Skipping file %s: workspace %s not found", file, workspaceID)
              result.SkippedFiles++
              continue
          }
          
          // Process file (adapter automatically adds hierarchy context)
          events, err := bm.processFile(file)
          if err != nil {
              bm.log.Errorf("Failed to process %s: %v", file, err)
              result.ErrorFiles++
              continue
          }
          
          result.ProcessedEvents += len(events)
          result.ProcessedFiles++
      }
      
      return result, nil
  }
  ```

- [ ] **Add Hierarchy Validation** (2 hours)
  - Verify project/machine/workspace exist
  - Create missing records if possible
  - Log warnings for anomalies
  - Skip unresolvable files

- [ ] **Update CLI Commands** (1 hour)
  ```bash
  # Show hierarchy info in dry-run
  devlog-collector backfill run --days 7 --dry-run
  # Output:
  # Found 44 files across 3 workspaces:
  # - Project: codervisor/devlog
  #   - Machine: marv-macbook-pro
  #     - Workspace: 7231726a (10 files, 200 events)
  #   - Machine: marv-codespace
  #     - Workspace: ea4583cb (5 files, 120 events)
  
  # Filter by project
  devlog-collector backfill run --project "codervisor/devlog"
  
  # Filter by machine
  devlog-collector backfill run --machine "marv-macbook-pro"
  ```

- [ ] **Testing** (1 hour)
  - Test with hierarchy
  - Test filtering
  - Test error handling

#### Success Criteria

- ✅ Backfill resolves hierarchy correctly
- ✅ Files without workspaces are skipped gracefully
- ✅ Filtering works
- ✅ Performance >500 events/sec

---

### Day 7: Integration Testing

**Time**: 1 day (8 hours)  
**Priority**: CRITICAL

#### Tasks

- [ ] **End-to-End Testing** (4 hours)
  - Process real Copilot logs (657 files)
  - Process Claude logs (if available)
  - Process Cursor logs (if available)
  - Verify hierarchy relationships in database
  - Check for orphaned records
  - Verify foreign keys

- [ ] **Performance Testing** (2 hours)
  - Measure event processing rate
  - Check memory usage over time
  - Profile hot paths
  - Optimize if needed

- [ ] **Bug Fixes** (2 hours)
  - Address issues found during testing
  - Update documentation

#### Test Scenarios

```bash
# 1. Fresh collection
devlog-collector start

# 2. Backfill historical data
devlog-collector backfill run --days 30

# 3. Verify in database
psql $DATABASE_URL <<EOF
-- Count events by hierarchy level
SELECT 
  p.full_name as project,
  m.hostname as machine,
  COUNT(DISTINCT w.id) as workspaces,
  COUNT(DISTINCT cs.id) as sessions,
  COUNT(ae.id) as events
FROM projects p
JOIN machines m ON m.id = ANY(
  SELECT machine_id FROM workspaces WHERE project_id = p.id
)
JOIN workspaces w ON w.project_id = p.id AND w.machine_id = m.id
JOIN chat_sessions cs ON cs.workspace_id = w.id
JOIN agent_events ae ON ae.session_id = cs.session_id
GROUP BY p.id, m.id
ORDER BY events DESC;

-- Check for orphaned records
SELECT 'Orphaned Events' as issue, COUNT(*) 
FROM agent_events ae
LEFT JOIN chat_sessions cs ON cs.session_id = ae.session_id
WHERE cs.id IS NULL;
EOF
```

#### Success Criteria

- ✅ All adapters process files successfully
- ✅ No orphaned events in database
- ✅ All foreign keys satisfied
- ✅ Performance: >500 events/sec sustained
- ✅ Memory usage <100MB
- ✅ Zero data loss

---

## 📊 Week 2 Success Metrics

### Functionality
- ✅ Copilot adapter integrated with hierarchy
- ✅ Claude adapter implemented and tested
- ✅ Cursor adapter implemented and tested
- ✅ Backfill system works with hierarchy
- ✅ All events properly linked to hierarchy

### Performance
- ✅ Event processing: >500 events/sec
- ✅ Memory usage: <100MB collector
- ✅ Backfill throughput: >1000 events/sec batch
- ✅ Hierarchy resolution: <1ms cached, <50ms uncached

### Quality
- ✅ Test coverage: >70% all adapters
- ✅ Integration tests passing
- ✅ No memory leaks
- ✅ Zero orphaned records
- ✅ Clean error handling

---

## 🚧 Blockers & Risks

### Potential Issues

1. **Claude/Cursor Log Samples Unavailable**
   - Risk: Can't implement adapters without real data
   - Mitigation: Start with Copilot, add others later if needed

2. **Performance Issues with Large Backfills**
   - Risk: Slow processing of 10K+ files
   - Mitigation: Parallel processing, batching, progress indicators

3. **Workspace Resolution Failures**
   - Risk: Some files can't be linked to workspaces
   - Mitigation: Graceful degradation, manual resolution API

---

**Next**: [Week 3: Backend & API](./week3-backend.md)
