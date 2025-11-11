# Codebase Reorganization Plan - AI Agent Observability Focus

**Created**: October 21, 2025  
**Status**: Planning  
**Context**: Transitioning from devlog work tracking to AI agent observability platform

## 🎯 Overview

As we pivot to the AI agent observability value proposition, our codebase needs reorganization to:

1. **Clarify the new vision** - Make it obvious this is an AI agent observability platform
2. **Clean up legacy concepts** - Remove or consolidate outdated "devlog entry" terminology
3. **Prepare for Go integration** - Structure for hybrid TypeScript + Go architecture
4. **Improve developer experience** - Better organized, more intuitive codebase

## 📊 Current State Analysis

### What We Have (Good Foundation)

✅ **Database Schema** - Already has `agent_events`, `agent_sessions` tables (Prisma)
✅ **Core Services** - `AgentEventService`, `AgentSessionService` implemented
✅ **Hybrid Architecture** - Clear separation: TypeScript (web/API) + Go (collector planned)
✅ **MCP Integration** - MCP server with tools infrastructure
✅ **Documentation** - Comprehensive design docs for AI agent observability

### What's Messy (Needs Cleanup)

❌ **Mixed Terminology** - "Devlog entry" vs "AI agent session" confusion
❌ **Legacy Features** - Devlog entry CRUD still prominent in UI/API
❌ **Unclear Focus** - READMEs emphasize work tracking over observability
❌ **Scattered Files** - Some AI agent code in unexpected locations
❌ **Missing Structure** - No clear packages/services-go folder yet

## 🗂️ Reorganization Strategy

### Phase 1: Terminology & Concept Cleanup (Week 1)

**Goal**: Update documentation and core concepts to reflect AI agent observability focus

#### 1.1 Terminology Rebrand: "Devlog Entry" → "Work Item"

- [ ] **Update all documentation** - Replace "devlog entry" with "work item"
- [ ] **Update UI labels** - Navigation, buttons, headers use "Work Item"
- [ ] **Add type aliases** - `type WorkItem = DevlogEntry` for gradual migration
- [ ] **API documentation** - Introduce "work item" terminology
- [ ] **Keep backward compatibility** - Support both terms during transition

#### 1.2 Update Primary Documentation

- [ ] **README.md** - Rewrite to emphasize AI agent observability as primary value
- [ ] **AGENTS.md** - Update guidelines to focus on observability features
- [ ] **Package READMEs** - Align all package docs with new vision

#### 1.3 Clarify Product Positioning

- [ ] Position "work items" as **optional project management feature**
- [ ] Make "agent sessions" and "agent events" the **primary concepts**
- [ ] Update all user-facing terminology consistently

#### 1.3 Documentation Structure

```
docs/
├── README.md (updated)
├── ai-agent-observability/        # Main feature docs (promoted from dev/)
│   ├── overview.md
│   ├── quick-start.md
│   ├── architecture.md
│   └── api-reference.md
├── dev/                           # Development documentation
│   ├── 20250115-ai-agent-observability/  (historical)
│   ├── 20251021-ai-evaluation-system/    (historical)
│   └── 20251021-codebase-reorganization/ (current)
├── guides/                        # User guides
│   ├── agent-setup.md             # NEW: Setting up agents
│   ├── dashboard-usage.md         # NEW: Using the dashboard
│   └── ... (existing guides)
└── project-management/            # Optional feature docs
    ├── devlog-entries.md          # Renamed from core docs
    └── ... (project management specific)
```

### Phase 2: Code Structure Reorganization (Week 2)

#### 2.1 Package Structure - Current to Target

**Current Structure:**

```
packages/
├── core/                  # Mixed: devlog + agent observability
├── mcp/                   # Mixed: devlog tools + agent tools
├── ai/                    # Chat parsing only
└── collector-go/          # Partially implemented
```

**Target Structure:**

```
packages/
├── core/                           # TypeScript core - business logic
│   ├── src/
│   │   ├── agent-observability/   # NEW: Agent-related code
│   │   │   ├── events/           # Event types, schemas
│   │   │   ├── sessions/         # Session management
│   │   │   ├── analytics/        # Metrics calculation
│   │   │   └── collectors/       # Collector config management
│   │   ├── project-management/    # Renamed from scattered locations
│   │   │   ├── work-items/       # Work item CRUD (renamed from devlog-entries)
│   │   │   ├── projects/         # Project management
│   │   │   └── documents/        # Document management
│   │   ├── services/              # Clean service layer
│   │   │   ├── agent-event-service.ts
│   │   │   ├── agent-session-service.ts
│   │   │   ├── project-service.ts
│   │   │   └── ... (consolidated)
│   │   ├── types/                 # All TypeScript types
│   │   ├── utils/                 # Utilities
│   │   └── validation/            # Validation logic
│
├── mcp/                            # MCP server
│   ├── src/
│   │   ├── tools/
│   │   │   ├── agent-observability/  # Agent monitoring tools (primary)
│   │   │   └── project-management/   # Devlog tools (secondary)
│   │   ├── handlers/
│   │   └── server/
│
├── ai/                             # AI analysis & intelligence
│   ├── src/
│   │   ├── pattern-detection/     # NEW: Agent behavior patterns
│   │   ├── quality-analysis/      # NEW: Code quality assessment
│   │   ├── recommendation-engine/ # NEW: Optimization suggestions
│   │   └── parsers/               # Existing chat parsing
│
├── collector-go/                   # Go collector (client-side)
│   ├── cmd/collector/
│   ├── internal/
│   │   ├── adapters/              # Agent-specific parsers
│   │   ├── buffer/                # SQLite buffer
│   │   ├── config/
│   │   └── watcher/
│   └── pkg/
│
└── services-go/                    # NEW: Go backend services
    ├── event-processor/            # High-performance event processing
    ├── stream-engine/              # WebSocket real-time streaming
    ├── analytics-engine/           # Metrics aggregation
    └── shared/                     # Shared Go libraries
```

#### 2.2 Service Layer Consolidation

**Current Issues:**

- Services scattered across multiple files
- Inconsistent naming (DevlogService vs PrismaDevlogService)
- Mixed concerns (CRUD + business logic)

**Target Service Architecture:**

```typescript
packages /
  core /
  src /
  services /
  // Agent Observability Services (PRIMARY)
  agent -
  event -
  service.ts; // Event CRUD & querying
agent - session - service.ts; // Session management
agent - analytics - service.ts; // Metrics & aggregations
agent - pattern - service.ts; // Pattern detection
collector - management - service.ts; // Collector control

// Project Management Services (SECONDARY)
project - service.ts; // Project CRUD
work - item - service.ts; // Work item CRUD (renamed from devlog-service)
document - service.ts; // Document management

// Infrastructure Services
database - service.ts; // Database connection
llm - service.ts; // LLM integrations
auth - service.ts; // Authentication
```

### Phase 3: UI/UX Reorganization (Week 3)

#### 3.1 Web App Structure - Current to Target

**Current Structure:**

```
apps/web/
├── app/
│   ├── api/                       # Mixed API routes
│   ├── devlogs/                   # Devlog-focused pages
│   ├── projects/                  # Project management
│   └── ...
└── components/
    ├── devlog/                    # Devlog components
    └── ui/                        # Generic UI
```

**Target Structure:**

```
apps/web/
├── app/
│   ├── api/
│   │   ├── agent-observability/   # Agent API routes (PRIMARY)
│   │   └── project-management/    # Project/work-item API (SECONDARY)
│   ├── dashboard/                 # NEW: Main agent dashboard
│   ├── sessions/                  # NEW: Agent sessions view
│   ├── analytics/                 # NEW: Analytics & reporting
│   ├── settings/
│   │   └── collectors/            # NEW: Collector management
│   └── projects/                  # Project management (moved)
│       └── [id]/work-items/       # Work items (renamed from devlogs)
│
└── components/
    ├── agent-observability/       # NEW: Agent components (PRIMARY)
    │   ├── session-timeline/
    │   ├── event-viewer/
    │   ├── analytics-charts/
    │   └── live-monitor/
    ├── project-management/        # Existing components (SECONDARY)
    │   ├── devlog-card/
    │   ├── project-selector/
    │   └── ...
    └── ui/                        # shadcn/ui components
```

#### 3.2 Navigation Reorganization

**Current Navigation:**

```
Home > Projects > Devlog Entries
```

**Target Navigation:**

```
Dashboard (Agent Activity)          # PRIMARY - Default landing
  ├── Live Sessions
  ├── Event Timeline
  └── Analytics

Projects                            # SECONDARY - Supporting feature
  └── [Project Name]
      ├── Overview
      ├── Agent Sessions           # Agent view for project
      └── Work Items               # Work tracking (renamed, optional)

Settings
  ├── Collectors                   # NEW: Manage collectors
  ├── Integrations
  └── Account
```

### Phase 4: API Reorganization (Week 4)

#### 4.1 API Structure

**Target API Routes:**

```
/api/v1/

# Agent Observability APIs (PRIMARY)
/agent-observability/
  /events                          # Query agent events
  /sessions                        # Session management
  /analytics                       # Metrics & aggregations
  /collectors                      # Collector management
  /stream                          # WebSocket for live data

# Project Management APIs (SECONDARY)
/projects                          # Project CRUD
/projects/:id/work-items           # Work items (renamed from devlogs)
/projects/:id/documents            # Documents
/projects/:id/agent-sessions       # Project-scoped agent sessions

# Infrastructure APIs
/auth                              # Authentication
/users                             # User management
/health                            # Health checks
```

#### 4.2 MCP Tools Reorganization

**Current:** Mixed devlog and agent tools in flat structure

**Target:** Organized by feature domain

```typescript
// Agent Observability Tools (PRIMARY - 10+ tools)
mcp_agent_start_session
mcp_agent_end_session
mcp_agent_log_event
mcp_agent_query_events
mcp_agent_get_session
mcp_agent_list_sessions
mcp_agent_get_analytics
mcp_collector_status
mcp_collector_configure

// Project Management Tools (SECONDARY - existing tools)
mcp_work_item_create          # Renamed from mcp_devlog_create
mcp_work_item_update          # Renamed from mcp_devlog_update
mcp_work_item_get             # Renamed from mcp_devlog_get
mcp_work_item_list            # Renamed from mcp_devlog_list
mcp_work_item_find_related    # Renamed from mcp_devlog_find_related
mcp_project_set_current
mcp_project_list
```

## 📋 Implementation Checklist

### Week 1: Documentation & Terminology

- [ ] **Rebrand "devlog entry" to "work item"** across all documentation
- [ ] Add `type WorkItem = DevlogEntry` alias in core package
- [ ] Update root README.md with AI agent observability focus
- [ ] Update AGENTS.md guidelines (include work item terminology)
- [ ] Reorganize docs/ folder structure
- [ ] Update package READMEs (core, mcp, ai, web)
- [ ] Create new user guides for agent observability features
- [ ] Update terminology across all docs (consistent language)

### Week 2: Code Structure

- [ ] Create new folder structure in packages/core/src/
- [ ] Move agent-related code to agent-observability/
- [ ] Move work item code to project-management/work-items/
- [ ] Consolidate service layer (rename devlog-service to work-item-service)
- [ ] Update all imports
- [ ] Update tsconfig paths if needed
- [ ] Run tests and fix breaking changes
- [ ] Keep backward compatibility for DevlogEntry type

### Week 3: UI/UX

- [ ] Create new app/dashboard/ as default landing
- [ ] Build agent-observability components
- [ ] Rename "Devlog" to "Work Items" in all UI labels
- [ ] Move work item pages to nested project structure
- [ ] Update navigation (Projects → Work Items)
- [ ] Update routing (/devlogs → /work-items)
- [ ] Test all user flows

### Week 4: API & Integration

- [ ] Reorganize API routes
- [ ] Group MCP tools by domain
- [ ] Update MCP tool descriptions
- [ ] Create API documentation
- [ ] Update integration examples
- [ ] End-to-end testing

## 🎯 Success Criteria

### User Experience

- [ ] First-time users immediately understand this is an AI agent observability tool
- [ ] Agent sessions and events are the primary UI focus
- [ ] Work items are clearly secondary/optional features (not "devlog entries")
- [ ] Terminology is intuitive ("work item" not "devlog entry")
- [ ] Navigation is intuitive and reflects feature priority

### Developer Experience

- [ ] Code organization matches mental model (agent observability > project management)
- [ ] Service layer is clean and well-defined
- [ ] Import paths are logical and consistent
- [ ] New developers can quickly understand the architecture

### Technical Quality

- [ ] All tests pass after reorganization
- [ ] No breaking changes to public APIs (or documented migration path)
- [ ] Performance not degraded
- [ ] Documentation is comprehensive and accurate

## 🚧 Migration Strategy

### Backward Compatibility

- **API Routes**: Maintain old routes with deprecation warnings for 2 versions
  - `/devlogs` → `/work-items` (both supported)
- **Types**: Export both `DevlogEntry` and `WorkItem` (alias)
- **Database Schema**: No breaking changes (table names stay same internally)
- **MCP Tools**: Support both naming conventions (devlog*\* and work_item*\*)
- **Documentation**: Keep old docs in `/docs/archive/` for reference

### Communication

- [ ] Create migration guide for existing users
- [ ] Announce changes in release notes
- [ ] Update public documentation
- [ ] Create video walkthrough of new structure

## 📝 Notes

### Key Decisions

1. **Rebrand "devlog entry" to "work item"** - More intuitive for users
2. **Preserve functionality** - Don't remove features, just rename and deprioritize
3. **Hybrid architecture confirmed** - TypeScript for web/API, Go for collectors/processing
4. **Database schema already aligned** - No migrations needed
5. **Gradual migration** - Support both terms during transition
6. **Focus on developer experience** - Make code structure match product vision

### Open Questions

- [ ] Do we rename the repository from "devlog" to something else?
- [ ] Should we version the API during this reorganization?
- [ ] How aggressively should we deprecate old terminology?
- [ ] Timeline for removing legacy code completely?

### Related Documents

- [AI Agent Observability Design](../20250115-ai-agent-observability/ai-agent-observability-design.md)
- [Go Collector Roadmap](../20250115-ai-agent-observability/GO_COLLECTOR_ROADMAP.md)
- [Performance Analysis](../20250115-ai-agent-observability/ai-agent-observability-performance-analysis.md)

---

**Next Steps**: Review this plan with team, get feedback, then execute phase by phase.
