# Week 1: Foundation

**Timeline**: November 1-8, 2025  
**Focus**: Database Schema + Core Collector Architecture  
**Status**: 📋 Planned

---

## 🎯 Objectives

1. Complete database schema with full hierarchy support
2. Enable TimescaleDB for time-series optimization
3. Implement core collector hierarchy detection
4. Establish foundation for Week 2 work

---

## 📅 Daily Plan

### Day 1-2: Database Schema Migration

**Owner**: Backend Team  
**Time**: 2 days (16 hours)

#### Tasks

- [ ] **Update Prisma Schema** (4 hours)
  - Add Projects, Machines, Workspaces, ChatSessions tables
  - Update AgentEvent to reference ChatSession
  - Add proper foreign keys and indexes
  - See [Database Schema](./database-schema.md) for complete schema

- [ ] **Create Migration Script** (3 hours)
  - Generate Prisma migration
  - Add TimescaleDB setup SQL
  - Test migration on development database
  - Create rollback script

- [ ] **Enable TimescaleDB** (2 hours)
  - Create extension
  - Convert agent_events to hypertable
  - Set up compression policies
  - Set up retention policies

- [ ] **Testing** (3 hours)
  - Insert sample data for all entities
  - Test hierarchy relationships
  - Verify foreign keys
  - Test time-series queries
  - Performance benchmarks

- [ ] **Create Continuous Aggregates** (4 hours)
  - Hourly event aggregates
  - Daily session aggregates
  - Machine activity aggregates
  - Test aggregate refresh

#### Deliverables

```bash
prisma/
├── schema.prisma (updated with hierarchy)
├── migrations/
│   └── 20251101_add_hierarchy_support/
│       ├── migration.sql
│       └── rollback.sql
└── seed.ts (sample hierarchy data)

scripts/
├── enable-timescaledb.sql
└── test-hierarchy.sql
```

#### Success Criteria

- ✅ Migration runs without errors
- ✅ All foreign keys working
- ✅ TimescaleDB hypertable created
- ✅ Sample data inserts successfully
- ✅ Queries return expected results
- ✅ Performance: <50ms for hierarchy queries

---

### Day 3-4: Go Collector - Machine Detection

**Owner**: Collector Team  
**Time**: 2 days (16 hours)

#### Tasks

- [ ] **Machine Detection Service** (6 hours)

  ```go
  // internal/hierarchy/machine.go

  type MachineDetector struct {
      config Config
      client *client.Client
      log    *logrus.Logger
  }

  func (md *MachineDetector) Detect() (*Machine, error) {
      // Get system info
      hostname, _ := os.Hostname()
      user, _ := user.Current()

      // Generate unique machine ID
      machineID := generateMachineID(hostname, user.Username, runtime.GOOS)

      machine := &Machine{
          MachineID:   machineID,
          Hostname:    hostname,
          Username:    user.Username,
          OSType:      runtime.GOOS,
          OSVersion:   detectOSVersion(),
          MachineType: detectMachineType(),
      }

      // Register with backend (upsert)
      return md.client.UpsertMachine(machine)
  }

  func detectOSVersion() string {
      // Platform-specific version detection
      switch runtime.GOOS {
      case "darwin":
          return detectMacOSVersion()
      case "linux":
          return detectLinuxVersion()
      case "windows":
          return detectWindowsVersion()
      }
      return "unknown"
  }

  func detectMachineType() string {
      // Heuristics to determine machine type
      if isGitHubActions() {
          return "ci"
      }
      if isCodespace() || isGitpod() {
          return "cloud"
      }
      if isSSH() {
          return "remote"
      }
      return "local"
  }
  ```

- [ ] **HTTP Client Methods** (4 hours)

  ```go
  // internal/client/machine.go

  func (c *Client) UpsertMachine(machine *Machine) (*Machine, error) {
      body, _ := json.Marshal(machine)

      resp, err := c.post("/api/machines", body)
      if err != nil {
          return nil, err
      }

      var result Machine
      json.Unmarshal(resp, &result)
      return &result, nil
  }
  ```

- [ ] **Testing** (4 hours)
  - Unit tests for detection logic
  - Mock HTTP client tests
  - Test on different platforms (macOS, Linux)
  - Test CI detection

- [ ] **Integration** (2 hours)
  - Add to main collector startup
  - Add configuration options
  - Add logging

#### Deliverables

```
internal/
└── hierarchy/
    ├── machine.go (detector implementation)
    ├── machine_test.go (comprehensive tests)
    ├── os_darwin.go (macOS-specific)
    ├── os_linux.go (Linux-specific)
    └── os_windows.go (Windows-specific)

internal/client/
└── machine.go (API methods)
```

#### Success Criteria

- ✅ Machine detected correctly on startup
- ✅ Unique machine ID generated consistently
- ✅ Machine type detected accurately
- ✅ Backend registration succeeds
- ✅ Tests pass on multiple platforms
- ✅ Test coverage >70%

---

### Day 5-6: Go Collector - Workspace Discovery

**Owner**: Collector Team  
**Time**: 2 days (16 hours)

#### Tasks

- [ ] **Workspace Discovery Service** (8 hours)

  ```go
  // internal/hierarchy/workspace.go

  type WorkspaceDiscovery struct {
      config    Config
      client    *client.Client
      machineID int
      log       *logrus.Logger
  }

  func (wd *WorkspaceDiscovery) DiscoverAll() ([]Workspace, error) {
      // 1. Scan VS Code workspace storage
      workspacePaths := wd.findVSCodeWorkspaces()

      var workspaces []Workspace
      for _, path := range workspacePaths {
          ws, err := wd.processWorkspace(path)
          if err != nil {
              wd.log.Warnf("Failed to process workspace %s: %v", path, err)
              continue
          }
          workspaces = append(workspaces, ws)
      }

      return workspaces, nil
  }

  func (wd *WorkspaceDiscovery) processWorkspace(path string) (Workspace, error) {
      // 1. Extract workspace ID from directory name
      workspaceID := extractWorkspaceID(path)

      // 2. Find actual project path from storage.json
      projectPath := wd.resolveProjectPath(path)

      // 3. Get git info
      gitInfo := wd.getGitInfo(projectPath)

      // 4. Resolve project from git remote
      project, err := wd.client.ResolveProject(gitInfo.RemoteURL)
      if err != nil {
          return Workspace{}, err
      }

      // 5. Create workspace record
      workspace := Workspace{
          ProjectID:     project.ID,
          MachineID:     wd.machineID,
          WorkspaceID:   workspaceID,
          WorkspacePath: projectPath,
          WorkspaceType: "folder",
          Branch:        gitInfo.Branch,
          Commit:        gitInfo.Commit,
      }

      // 6. Register with backend
      return wd.client.UpsertWorkspace(workspace)
  }

  func (wd *WorkspaceDiscovery) findVSCodeWorkspaces() []string {
      // Platform-specific paths
      var basePaths []string
      switch runtime.GOOS {
      case "darwin":
          basePaths = []string{
              "~/Library/Application Support/Code/User/workspaceStorage",
              "~/Library/Application Support/Code - Insiders/User/workspaceStorage",
          }
      case "linux":
          basePaths = []string{
              "~/.config/Code/User/workspaceStorage",
              "~/.config/Code - Insiders/User/workspaceStorage",
          }
      case "windows":
          basePaths = []string{
              "%APPDATA%/Code/User/workspaceStorage",
              "%APPDATA%/Code - Insiders/User/workspaceStorage",
          }
      }

      // Scan directories
      var workspaces []string
      for _, base := range basePaths {
          dirs, _ := filepath.Glob(filepath.Join(base, "*"))
          workspaces = append(workspaces, dirs...)
      }

      return workspaces
  }
  ```

- [ ] **Git Integration** (4 hours)

  ```go
  // internal/hierarchy/git.go

  type GitInfo struct {
      RemoteURL string
      Branch    string
      Commit    string
  }

  func getGitInfo(path string) (*GitInfo, error) {
      repo, err := git.PlainOpen(path)
      if err != nil {
          return nil, err
      }

      // Get remote URL
      remote, _ := repo.Remote("origin")
      remoteURL := remote.Config().URLs[0]

      // Get current branch
      head, _ := repo.Head()
      branch := head.Name().Short()

      // Get current commit
      commit := head.Hash().String()

      return &GitInfo{
          RemoteURL: normalizeGitURL(remoteURL),
          Branch:    branch,
          Commit:    commit,
      }, nil
  }
  ```

- [ ] **Testing** (3 hours)
  - Unit tests with mock filesystem
  - Test workspace ID extraction
  - Test git info extraction
  - Integration test with real VS Code storage

- [ ] **Documentation** (1 hour)
  - Document VS Code storage structure
  - Document workspace resolution logic

#### Deliverables

```
internal/
└── hierarchy/
    ├── workspace.go (discovery implementation)
    ├── workspace_test.go
    ├── git.go (git integration)
    └── git_test.go

docs/
└── dev/20251031-mvp-launch-plan/
    └── workspace-discovery.md
```

#### Success Criteria

- ✅ Discovers all VS Code workspaces
- ✅ Extracts workspace IDs correctly
- ✅ Resolves project paths accurately
- ✅ Git info extracted successfully
- ✅ Projects created/matched correctly
- ✅ Workspaces registered with backend
- ✅ Test coverage >70%

---

### Day 7: Hierarchy Cache Implementation

**Owner**: Collector Team  
**Time**: 1 day (8 hours)

#### Tasks

- [ ] **Cache Implementation** (5 hours)

  ```go
  // internal/hierarchy/cache.go

  type HierarchyCache struct {
      workspaces map[string]*WorkspaceContext
      mu         sync.RWMutex
      client     *client.Client
      log        *logrus.Logger
  }

  type WorkspaceContext struct {
      ProjectID   int
      MachineID   int
      WorkspaceID int
      ProjectName string
      MachineName string
  }

  func NewHierarchyCache(client *client.Client) *HierarchyCache {
      return &HierarchyCache{
          workspaces: make(map[string]*WorkspaceContext),
          client:     client,
      }
  }

  func (hc *HierarchyCache) Initialize(workspaces []Workspace) {
      hc.mu.Lock()
      defer hc.mu.Unlock()

      for _, ws := range workspaces {
          ctx := &WorkspaceContext{
              ProjectID:   ws.ProjectID,
              MachineID:   ws.MachineID,
              WorkspaceID: ws.ID,
          }
          hc.workspaces[ws.WorkspaceID] = ctx
      }
  }

  func (hc *HierarchyCache) Resolve(workspaceID string) (*WorkspaceContext, error) {
      // Try cache first
      hc.mu.RLock()
      ctx, ok := hc.workspaces[workspaceID]
      hc.mu.RUnlock()

      if ok {
          return ctx, nil
      }

      // Lazy load from backend
      workspace, err := hc.client.GetWorkspace(workspaceID)
      if err != nil {
          return nil, fmt.Errorf("workspace not found: %w", err)
      }

      ctx = &WorkspaceContext{
          ProjectID:   workspace.ProjectID,
          MachineID:   workspace.MachineID,
          WorkspaceID: workspace.ID,
          ProjectName: workspace.Project.FullName,
          MachineName: workspace.Machine.Hostname,
      }

      // Cache it
      hc.mu.Lock()
      hc.workspaces[workspaceID] = ctx
      hc.mu.Unlock()

      return ctx, nil
  }

  func (hc *HierarchyCache) Refresh() error {
      // Re-fetch all workspaces from backend
      workspaces, err := hc.client.ListWorkspaces()
      if err != nil {
          return err
      }

      hc.Initialize(workspaces)
      return nil
  }
  ```

- [ ] **Testing** (2 hours)
  - Test cache hit/miss
  - Test lazy loading
  - Test concurrent access
  - Test refresh

- [ ] **Integration** (1 hour)
  - Wire into main collector
  - Add to startup sequence

#### Success Criteria

- ✅ Cache initialized on startup
- ✅ Fast lookups (<1ms)
- ✅ Lazy loading works
- ✅ Thread-safe
- ✅ Refresh works correctly

---

## 📊 Week 1 Success Metrics

### Functionality

- ✅ Database schema migrated successfully
- ✅ TimescaleDB enabled and configured
- ✅ Machine detected automatically
- ✅ Workspaces discovered automatically
- ✅ Hierarchy cache working

### Performance

- ✅ Hierarchy queries <50ms P95
- ✅ Cache lookups <1ms
- ✅ Workspace discovery <5 seconds
- ✅ Time-series inserts >1000/sec

### Quality

- ✅ All tests passing
- ✅ Test coverage >70%
- ✅ No memory leaks
- ✅ Clean error handling

---

## 🚧 Blockers & Risks

### Potential Issues

1. **VS Code Storage Format Changes**
   - Risk: Different VS Code versions have different structures
   - Mitigation: Test with multiple VS Code versions

2. **Git Remote URL Variations**
   - Risk: SSH vs HTTPS URLs need normalization
   - Mitigation: Robust URL parsing logic

3. **Performance on Large Workspace Storage**
   - Risk: Slow discovery with 100+ workspaces
   - Mitigation: Parallel processing, caching

---

**Next**: [Week 2: Collector Implementation](./week2-collector.md)
