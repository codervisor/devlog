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

#### 1.1 Update Primary Documentation
- [ ] **README.md** - Rewrite to emphasize AI agent observability as primary value
- [ ] **AGENTS.md** - Update guidelines to focus on observability features
- [ ] **Package READMEs** - Align all package docs with new vision

#### 1.2 Clarify Product Positioning
- [ ] Position "devlog entries" as **optional project management feature**
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
│   │   │   ├── devlog-entries/   # Devlog CRUD (legacy)
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
packages/core/src/services/

// Agent Observability Services (PRIMARY)
agent-event-service.ts              // Event CRUD & querying
agent-session-service.ts            // Session management
agent-analytics-service.ts          // Metrics & aggregations
agent-pattern-service.ts            // Pattern detection
collector-management-service.ts     // Collector control

// Project Management Services (SECONDARY)
project-service.ts                  // Project CRUD
devlog-service.ts                   // Devlog entry CRUD (legacy)
document-service.ts                 // Document management

// Infrastructure Services
database-service.ts                 // Database connection
llm-service.ts                      // LLM integrations
auth-service.ts                     // Authentication
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
│   │   └── project-management/    # Project/devlog API (SECONDARY)
│   ├── dashboard/                 # NEW: Main agent dashboard
│   ├── sessions/                  # NEW: Agent sessions view
│   ├── analytics/                 # NEW: Analytics & reporting
│   ├── settings/
│   │   └── collectors/            # NEW: Collector management
│   └── projects/                  # Project management (moved)
│       └── [id]/devlogs/          # Devlog entries (nested)
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
      └── Devlog Entries           # Work tracking (optional)

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
/projects/:id/devlogs              # Devlog entries
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
mcp_devlog_create
mcp_devlog_update
mcp_devlog_get
mcp_devlog_list
mcp_devlog_find_related
mcp_project_set_current
mcp_project_list
```

## 📋 Implementation Checklist

### Week 1: Documentation & Terminology
- [ ] Update root README.md with AI agent observability focus
- [ ] Update AGENTS.md guidelines
- [ ] Reorganize docs/ folder structure
- [ ] Update package READMEs (core, mcp, ai, web)
- [ ] Create new user guides for agent observability features
- [ ] Update terminology across all docs (consistent language)

### Week 2: Code Structure
- [ ] Create new folder structure in packages/core/src/
- [ ] Move agent-related code to agent-observability/
- [ ] Move devlog code to project-management/
- [ ] Consolidate service layer
- [ ] Update all imports
- [ ] Update tsconfig paths if needed
- [ ] Run tests and fix breaking changes

### Week 3: UI/UX
- [ ] Create new app/dashboard/ as default landing
- [ ] Build agent-observability components
- [ ] Move devlog pages to nested project structure
- [ ] Update navigation
- [ ] Update routing
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
- [ ] Devlog entries are clearly secondary/optional features
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
- **Database Schema**: No breaking changes (already supports both models)
- **MCP Tools**: Keep all existing tools, mark legacy ones with [LEGACY] prefix
- **Documentation**: Keep old docs in `/docs/archive/` for reference

### Communication
- [ ] Create migration guide for existing users
- [ ] Announce changes in release notes
- [ ] Update public documentation
- [ ] Create video walkthrough of new structure

## 📝 Notes

### Key Decisions
1. **Preserve devlog entry functionality** - Don't remove, just deprioritize
2. **Hybrid architecture confirmed** - TypeScript for web/API, Go for collectors/processing
3. **Database schema already aligned** - No migrations needed
4. **Focus on developer experience** - Make code structure match product vision

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
