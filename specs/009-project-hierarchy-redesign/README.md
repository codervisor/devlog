---
status: complete
created: '2025-10-31T00:00:00.000Z'
tags:
  - hierarchy
  - architecture
  - project-management
priority: high
completed: '2025-11-02'
created_at: '2025-10-31T11:14:10+08:00'
updated_at: '2025-11-10T02:59:33.561Z'
updated: '2025-11-10'
---

# Project Management Hierarchy Redesign

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-10-31 · **Tags**: hierarchy, architecture, project-management

**Created**: October 31, 2025  
**Status**: Design Phase  
**Priority**: HIGH  
**Purpose**: Establish proper hierarchy for tracking AI agent activities across projects, machines, and workspaces

---

## 🎯 Problem Statement

Current system has a **flat structure** that doesn't capture the real-world organization:

- ❌ Projects are conflated with workspaces (VS Code folders)
- ❌ No concept of machines/environments where agents run
- ❌ Multiple developers on same project create confusion
- ❌ Same repo opened in multiple locations isn't tracked properly
- ❌ Can't distinguish between personal machine vs CI/CD vs cloud workspace

**Real-world scenario that's broken:**

```
Developer opens codervisor/devlog on:
1. MacBook Pro (local development)
2. Linux server (remote SSH)
3. GitHub Codespaces (cloud)
4. CI/CD pipeline (automated)

Currently: All treated as separate "projects" with no relationship
Reality: Same project, different machines/contexts
```

---

## 🏗️ Proposed Hierarchy

```
Organization (optional)
└── Projects (repos/codebases)
    └── Machines (where work happens)
        └── Workspaces (VS Code windows/folders)
            └── Chat Sessions (conversation threads)
                └── Events (individual actions)
```

### Visual Example

```
codervisor/devlog (PROJECT)
├── marv-macbook-pro (MACHINE)
│   ├── workspace-7231726a (WORKSPACE: /Users/marv/projects/devlog)
│   │   ├── session-3b36cddd (Oct 31, 2025 - "Fix parser bug")
│   │   │   ├── llm_request event
│   │   │   ├── tool_use: findTextInFiles
│   │   │   ├── file_read: copilot_adapter.go
│   │   │   └── llm_response event
│   │   └── session-74dab7ab (Oct 30, 2025 - "Add tests")
│   │       └── ... events ...
│   └── workspace-487fd76a (WORKSPACE: /Users/marv/projects/tikazyq/devlog)
│       └── ... (old fork, different path)
│
├── marv-codespace (MACHINE)
│   └── workspace-ea4583cb (WORKSPACE: vscode-remote://codespaces/...)
│       └── session-xxx (Oct 15, 2025 - "Remote development")
│
└── github-actions-ci (MACHINE)
    └── workspace-auto (WORKSPACE: /home/runner/work/devlog)
        └── session-yyy (Automated test assistance)
```

---

## 📊 Entity Definitions

### 1. Project

**Definition**: A codebase/repository that's being worked on.

**Attributes**:

- `id`: Unique identifier (auto-increment)
- `name`: Human-readable name (e.g., "devlog")
- `full_name`: Full repo name (e.g., "codervisor/devlog")
- `repo_url`: Git remote URL
- `repo_owner`: Owner/organization
- `repo_name`: Repository name
- `description`: Optional description
- `created_at`: First seen
- `updated_at`: Last activity

**Identity**: Determined by git remote URL (canonical identifier)

**Example**:

```json
{
  "id": 1,
  "name": "devlog",
  "full_name": "codervisor/devlog",
  "repo_url": "git@github.com:codervisor/devlog.git",
  "repo_owner": "codervisor",
  "repo_name": "devlog"
}
```

---

### 2. Machine

**Definition**: A physical or virtual machine where AI agents run.

**Attributes**:

- `id`: Unique identifier
- `machine_id`: Unique machine identifier (hostname + user + OS)
- `hostname`: Machine hostname
- `username`: OS username
- `os_type`: OS (darwin, linux, windows)
- `os_version`: OS version
- `machine_type`: Type (local, remote, cloud, ci)
- `ip_address`: Optional IP for remote machines
- `created_at`: First seen
- `last_seen_at`: Last activity

**Identity**: Generated from `{hostname}-{username}-{os_type}`

**Machine Types**:

- `local`: Developer's personal machine
- `remote`: SSH/remote development server
- `cloud`: Cloud workspace (Codespaces, Gitpod, etc.)
- `ci`: CI/CD pipeline runner

**Example**:

```json
{
  "id": 1,
  "machine_id": "marv-macbook-pro-darwin",
  "hostname": "marv-macbook-pro",
  "username": "marvzhang",
  "os_type": "darwin",
  "os_version": "14.5",
  "machine_type": "local"
}
```

---

### 3. Workspace

**Definition**: A VS Code window/folder opened on a specific machine for a specific project.

**Attributes**:

- `id`: Unique identifier
- `project_id`: Foreign key → projects
- `machine_id`: Foreign key → machines
- `workspace_id`: VS Code workspace ID (from directory name)
- `workspace_path`: Absolute path to folder
- `workspace_type`: Type (folder, multi-root)
- `branch`: Current git branch (optional)
- `commit`: Current git commit (optional)
- `created_at`: First seen
- `last_seen_at`: Last activity

**Identity**: `workspace_id` is unique per VS Code installation

**Example**:

```json
{
  "id": 1,
  "project_id": 1,
  "machine_id": 1,
  "workspace_id": "7231726a3fbbc45e361bffad4fcc5cf9",
  "workspace_path": "/Users/marvzhang/projects/codervisor/devlog",
  "workspace_type": "folder",
  "branch": "develop",
  "commit": "abc123def"
}
```

---

### 4. Chat Session

**Definition**: A single conversation thread between user and AI agent.

**Attributes**:

- `id`: Unique identifier
- `session_id`: UUID from chat session filename
- `workspace_id`: Foreign key → workspaces
- `agent_type`: Agent used (copilot, cursor, claude, etc.)
- `model_id`: Specific model (gpt-4, claude-sonnet-4.5, etc.)
- `started_at`: First message timestamp
- `ended_at`: Last message timestamp (optional)
- `message_count`: Number of request-response pairs
- `total_tokens`: Estimated total tokens used
- `created_at`: Record creation time

**Identity**: `session_id` (UUID from filename)

**Example**:

```json
{
  "id": 1,
  "session_id": "3b36cddd-95cf-446f-9888-5165fac29787",
  "workspace_id": 1,
  "agent_type": "copilot",
  "model_id": "copilot/claude-sonnet-4.5",
  "started_at": "2025-10-31T10:54:36Z",
  "message_count": 2,
  "total_tokens": 1250
}
```

---

### 5. Event

**Definition**: Individual actions within a chat session (existing structure).

**Attributes**: (Keep existing structure, add foreign keys)

- `id`: Unique identifier
- `session_id`: Foreign key → chat_sessions
- `event_type`: Type (llm_request, tool_use, etc.)
- `timestamp`: When event occurred
- `data`: Event-specific data (JSON)
- `context`: Additional context (JSON)
- `metrics`: Performance metrics (JSON)

**No changes needed** - just link to chat_sessions table

---

## 🗄️ Database Schema

```sql
-- Projects table
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    full_name TEXT UNIQUE NOT NULL,
    repo_url TEXT UNIQUE NOT NULL,
    repo_owner TEXT,
    repo_name TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_full_name ON projects(full_name);
CREATE INDEX idx_projects_repo_url ON projects(repo_url);

-- Machines table
CREATE TABLE machines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id TEXT UNIQUE NOT NULL,
    hostname TEXT NOT NULL,
    username TEXT NOT NULL,
    os_type TEXT NOT NULL,
    os_version TEXT,
    machine_type TEXT NOT NULL CHECK(machine_type IN ('local', 'remote', 'cloud', 'ci')),
    ip_address TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_machines_machine_id ON machines(machine_id);
CREATE INDEX idx_machines_hostname ON machines(hostname);

-- Workspaces table
CREATE TABLE workspaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    machine_id INTEGER NOT NULL,
    workspace_id TEXT UNIQUE NOT NULL,
    workspace_path TEXT NOT NULL,
    workspace_type TEXT NOT NULL CHECK(workspace_type IN ('folder', 'multi-root')),
    branch TEXT,
    commit TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
);

CREATE INDEX idx_workspaces_workspace_id ON workspaces(workspace_id);
CREATE INDEX idx_workspaces_project_id ON workspaces(project_id);
CREATE INDEX idx_workspaces_machine_id ON workspaces(machine_id);
CREATE UNIQUE INDEX idx_workspaces_composite ON workspaces(project_id, machine_id, workspace_id);

-- Chat sessions table
CREATE TABLE chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    workspace_id INTEGER NOT NULL,
    agent_type TEXT NOT NULL,
    model_id TEXT,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX idx_chat_sessions_workspace_id ON chat_sessions(workspace_id);
CREATE INDEX idx_chat_sessions_started_at ON chat_sessions(started_at);

-- Events table (simplified - link to chat_sessions)
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    data JSON NOT NULL,
    context JSON,
    metrics JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_events_session_id ON events(session_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_timestamp ON events(timestamp);
```

---

## 🔄 Data Flow & Resolution

### On Collector Startup

```
1. Detect current machine
   ├─ Get hostname, username, OS
   └─ Create/update machine record

2. Scan VS Code workspaces
   ├─ Read workspace.json files
   ├─ Extract project paths
   └─ For each workspace:
       ├─ Get git info (remote URL, branch, commit)
       ├─ Create/update project record
       └─ Create/update workspace record (linking project + machine)

3. Build in-memory cache
   └─ workspace_id → (project_id, machine_id, workspace_id)
```

### During Event Collection

```
1. Parse chat session file
   ├─ Extract workspace_id from file path
   └─ Extract session_id from filename

2. Resolve hierarchy
   ├─ Look up workspace_id → workspace record
   ├─ Get project_id and machine_id from workspace
   └─ Create/update chat_session record

3. Store events
   └─ Link to chat_session.id (not workspace_id)
```

### Example Query Flow

```sql
-- Get all activity for a project across all machines
SELECT
    p.name as project,
    m.hostname as machine,
    w.workspace_path,
    cs.session_id,
    COUNT(e.id) as event_count
FROM projects p
JOIN workspaces w ON w.project_id = p.id
JOIN machines m ON m.id = w.machine_id
JOIN chat_sessions cs ON cs.workspace_id = w.id
JOIN events e ON e.session_id = cs.id
WHERE p.full_name = 'codervisor/devlog'
GROUP BY p.id, m.id, w.id, cs.id
ORDER BY cs.started_at DESC;
```

---

## 🔧 Implementation Plan

### Phase 1: Schema Migration (2-3 hours)

**Tasks**:

- [ ] Create migration script for new schema
- [ ] Migrate existing data:
  - [ ] Extract projects from old project_id/path data
  - [ ] Create machine records for current machine
  - [ ] Create workspace records linking projects + machines
  - [ ] Migrate chat sessions (currently might not exist as separate table)
  - [ ] Update events to reference chat_sessions.id
- [ ] Test migration with backup data
- [ ] Rollback plan if needed

### Phase 2: Collector Updates (3-4 hours)

**Tasks**:

- [ ] Update collector initialization:
  - [ ] Detect current machine
  - [ ] Scan workspaces and resolve projects
  - [ ] Build hierarchy cache
- [ ] Update event parsing:
  - [ ] Resolve workspace → project + machine
  - [ ] Create/update chat session records
  - [ ] Link events to chat sessions
- [ ] Update queries to use new hierarchy
- [ ] Update API responses to include hierarchy

### Phase 3: API & Web UI Updates (4-5 hours)

**Tasks**:

- [ ] Update API endpoints:
  - [ ] `/api/projects` - List projects
  - [ ] `/api/projects/:id/machines` - Machines for project
  - [ ] `/api/projects/:id/workspaces` - Workspaces for project
  - [ ] `/api/workspaces/:id/sessions` - Sessions for workspace
  - [ ] `/api/sessions/:id/events` - Events for session
- [ ] Update web UI:
  - [ ] Project selector with hierarchy view
  - [ ] Machine filter
  - [ ] Workspace filter
  - [ ] Session timeline view
- [ ] Update analytics to aggregate across hierarchy

### Phase 4: Testing & Documentation (2 hours)

**Tasks**:

- [ ] Test with multiple machines (simulate remote/cloud)
- [ ] Test with multiple workspaces per project
- [ ] Test migration with real data
- [ ] Update documentation
- [ ] Update MCP server tools if needed

---

## 🎯 Benefits

### 1. Proper Organization

- ✅ Same project tracked across multiple machines
- ✅ Clear machine/environment context
- ✅ Multiple developers on same project distinguished
- ✅ Historical tracking of where work happened

### 2. Better Analytics

- ✅ Aggregate project activity across all machines
- ✅ Compare productivity on different machines
- ✅ Track which environments are most used
- ✅ Identify patterns (local vs remote development)

### 3. Team Collaboration

- ✅ See who's working on what machine
- ✅ Track team activity on shared projects
- ✅ Understand distributed development patterns
- ✅ Support for pair programming / remote sessions

### 4. Data Integrity

- ✅ No duplicate projects for same repo
- ✅ Proper foreign key relationships
- ✅ Cascade deletes work correctly
- ✅ Easier to query and analyze

---

## 🚨 Breaking Changes

### Database

- **BREAKING**: Schema change requires migration
- **BREAKING**: Old `projectId` field in events needs mapping
- **IMPACT**: Existing data must be migrated

### API

- **BREAKING**: Response shapes will change to include hierarchy
- **BREAKING**: Some endpoints may be renamed/restructured
- **IMPACT**: Web UI needs updates, MCP server tools need updates

### Migration Strategy

1. Create new tables alongside old ones
2. Migrate data with mapping
3. Update code to use new tables
4. Test thoroughly
5. Drop old tables after verification
6. Update all consumers (web UI, MCP server)

---

## 📋 Open Questions

### Q1: How to handle machine detection?

**Options**:

- A) Auto-detect on collector startup
- B) User configures machine name
- C) Hybrid: auto-detect with option to override

**Recommendation**: Option C - auto-detect but allow override in config

### Q2: How to handle multiple projects in one workspace (monorepo)?

**Options**:

- A) Link workspace to primary project only
- B) Support many-to-many relationship
- C) Create separate workspace records per project

**Recommendation**: Option A for now - link to primary project, enhance later

### Q3: Should we support Organization entity?

**Options**:

- A) Yes - add organization level above projects
- B) No - extract from repo_owner field when needed
- C) Later - add in future iteration

**Recommendation**: Option B - not needed yet, can add later

### Q4: How to sync across multiple machines?

**Options**:

- A) Each machine sends to central server
- B) Machines sync databases
- C) Export/import between machines

**Recommendation**: Option A - already have backend API for this

---

## 🚀 Next Steps

1. **Review & Approval**: Get feedback on design
2. **Proof of Concept**: Test migration script with sample data
3. **Implementation**: Follow phase plan
4. **Testing**: Verify with real multi-machine scenario
5. **Deployment**: Roll out to production

**Estimated Total Time**: 11-14 hours (across all phases)

---

## 📚 References

- [Database Architecture](../20251031-database-architecture/README.md) - PostgreSQL + TimescaleDB design
- [Workspace ID Mapping](./workspace-id-mapping.md)
- [Copilot Adapter Design](./copilot-adapter-redesign.md)
- Current schema: `packages/core/src/entities/`
- Backend API: `apps/web/app/api/`
