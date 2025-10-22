# Phase 2: Code Structure Reorganization - Implementation Plan

**Status**: ✅ Complete  
**Phase**: 2 of 4  
**Completed**: October 21, 2025  
**Actual Effort**: ~2 hours  
**Risk Level**: Medium → Low (No breaking changes)  
**Prerequisites**: Phase 1 (Quick Wins) Complete ✅

## 🎯 Objective

Move actual service files into the organized folder structure established in Phase 1, updating all import paths while maintaining backward compatibility.

## 📊 Current State Analysis

### Existing Structure
```
packages/core/src/
├── services/
│   ├── agent-event-service.ts          → Move to agent-observability/events/
│   ├── agent-session-service.ts        → Move to agent-observability/sessions/
│   ├── prisma-project-service.ts       → Move to project-management/projects/
│   ├── prisma-devlog-service.ts        → Move to project-management/work-items/
│   ├── prisma-document-service.ts      → Move to project-management/documents/
│   ├── prisma-chat-service.ts          → Move to project-management/chat/
│   ├── prisma-auth-service.ts          → Keep in services/ (shared)
│   ├── sso-service.ts                  → Keep in services/ (shared)
│   ├── llm-service.ts                  → Keep in services/ (shared)
│   ├── prisma-service-base.ts          → Keep in services/ (base class)
│   └── index.ts                        → Update re-exports
├── agent-observability/
│   └── index.ts                        → Update to import from new locations
└── project-management/
    └── index.ts                        → Update to import from new locations
```

### Impact Assessment

**Files to Move**: 6 service files + their test files (12 files total)  
**Files to Update**: ~20 files (import statements)  
**Packages Affected**: core, mcp, web

## 🗺️ Implementation Strategy

### Step 1: Create Subdirectory Structure

Create the detailed folder structure within the new modules:

```bash
packages/core/src/
├── agent-observability/
│   ├── index.ts                    # Already exists, will update
│   ├── events/
│   │   ├── index.ts               # New: re-export agent-event-service
│   │   └── agent-event-service.ts # Moved from services/
│   ├── sessions/
│   │   ├── index.ts               # New: re-export agent-session-service
│   │   └── agent-session-service.ts # Moved from services/
│   └── __tests__/                 # Moved test files
│       ├── agent-event-service.test.ts
│       └── agent-session-service.test.ts
│
└── project-management/
    ├── index.ts                    # Already exists, will update
    ├── projects/
    │   ├── index.ts               # New: re-export prisma-project-service
    │   └── prisma-project-service.ts # Moved from services/
    ├── work-items/
    │   ├── index.ts               # New: re-export prisma-devlog-service
    │   └── prisma-devlog-service.ts # Moved from services/
    ├── documents/
    │   ├── index.ts               # New: re-export prisma-document-service
    │   └── prisma-document-service.ts # Moved from services/
    ├── chat/
    │   ├── index.ts               # New: re-export prisma-chat-service
    │   └── prisma-chat-service.ts # Moved from services/
    └── __tests__/                 # Moved test files
        ├── prisma-project-service.test.ts
        ├── prisma-devlog-service.test.ts
        ├── prisma-document-service.test.ts
        └── prisma-chat-service.test.ts
```

### Step 2: Move Service Files (One at a Time)

**Order of Migration** (least to most dependent):

1. **AgentEventService** (minimal dependencies)
   - Move `agent-event-service.ts` → `agent-observability/events/`
   - Create `agent-observability/events/index.ts`
   - Update `agent-observability/index.ts`
   - Update imports in test files
   - Run tests

2. **AgentSessionService** (depends on events)
   - Move `agent-session-service.ts` → `agent-observability/sessions/`
   - Create `agent-observability/sessions/index.ts`
   - Update `agent-observability/index.ts`
   - Update imports
   - Run tests

3. **PrismaProjectService** (minimal dependencies)
   - Move `prisma-project-service.ts` → `project-management/projects/`
   - Create `project-management/projects/index.ts`
   - Update `project-management/index.ts`
   - Update imports
   - Run tests

4. **PrismaDocumentService** (depends on project)
   - Move `prisma-document-service.ts` → `project-management/documents/`
   - Create `project-management/documents/index.ts`
   - Update `project-management/index.ts`
   - Update imports
   - Run tests

5. **PrismaDevlogService** (depends on project, documents)
   - Move `prisma-devlog-service.ts` → `project-management/work-items/`
   - Create `project-management/work-items/index.ts`
   - Update `project-management/index.ts`
   - Update imports
   - Run tests

6. **PrismaChatService** (optional feature)
   - Move `prisma-chat-service.ts` → `project-management/chat/`
   - Create `project-management/chat/index.ts`
   - Update `project-management/index.ts`
   - Update imports
   - Run tests

### Step 3: Update Import Paths

**Files Requiring Import Updates:**

```typescript
// Core package
packages/core/src/
├── agent-observability/index.ts        # Update to new paths
├── project-management/index.ts         # Update to new paths
├── services/index.ts                   # Update backward compat re-exports
└── server.ts                           # May need updates

// MCP package
packages/mcp/src/
├── adapters/prisma-adapter.ts          # Update service imports
├── handlers/tool-handlers.ts           # Update service imports
└── server/server-manager.ts            # Update service imports

// Web package
apps/web/
├── app/api/*/route.ts                  # Multiple API routes import services
└── lib/services.ts                     # Service initialization
```

### Step 4: Maintain Backward Compatibility

**Critical**: Keep `packages/core/src/services/index.ts` exporting all services from their new locations:

```typescript
// packages/core/src/services/index.ts
/**
 * Backward compatibility exports
 * @deprecated Import from @codervisor/devlog-core/server or specific modules instead
 */

// Agent Observability
export { AgentEventService } from '../agent-observability/events/agent-event-service.js';
export { AgentSessionService } from '../agent-observability/sessions/agent-session-service.js';

// Project Management
export { PrismaProjectService } from '../project-management/projects/prisma-project-service.js';
export { PrismaDevlogService } from '../project-management/work-items/prisma-devlog-service.js';
export { PrismaDocumentService } from '../project-management/documents/prisma-document-service.js';
export { PrismaChatService } from '../project-management/chat/prisma-chat-service.js';

// Shared services (stay in place)
export * from './prisma-auth-service.js';
export * from './sso-service.js';
export * from './llm-service.js';
export * from './prisma-service-base.js';
```

### Step 5: Update Module Exports

**Update agent-observability/index.ts:**

```typescript
// Direct exports from new locations
export { AgentEventService } from './events/agent-event-service.js';
export { AgentSessionService } from './sessions/agent-session-service.js';

// Or via subdirectory indexes
export * from './events/index.js';
export * from './sessions/index.js';
```

**Update project-management/index.ts:**

```typescript
// Direct exports from new locations
export { PrismaProjectService } from './projects/prisma-project-service.js';
export { PrismaDevlogService } from './work-items/prisma-devlog-service.js';
export { PrismaDocumentService } from './documents/prisma-document-service.js';
export { PrismaChatService } from './chat/prisma-chat-service.js';

// Or via subdirectory indexes
export * from './projects/index.js';
export * from './work-items/index.js';
export * from './documents/index.js';
export * from './chat/index.js';
```

## ✅ Validation Checklist

After each service move:

- [x] Service file moved to new location
- [x] Subdirectory index.ts created with re-exports
- [x] Module index.ts updated
- [x] services/index.ts backward compat updated
- [x] Import paths updated in dependent files
- [x] Test files moved and updated
- [x] `pnpm build` succeeds
- [x] `pnpm test` passes for affected services (same status as before)
- [x] Import validation passes
- [x] No breaking changes to public API

After all moves complete:

- [x] All services in new locations
- [x] All tests passing (no new failures)
- [x] All builds successful
- [x] Documentation updated
- [x] Migration guide created (backward compatibility maintained)

## 🔧 Implementation Commands

### Create Directory Structure
```bash
# Agent observability
mkdir -p packages/core/src/agent-observability/{events,sessions,__tests__}

# Project management
mkdir -p packages/core/src/project-management/{projects,work-items,documents,chat,__tests__}
```

### Move Files (Example for AgentEventService)
```bash
# Move service
mv packages/core/src/services/agent-event-service.ts \
   packages/core/src/agent-observability/events/

# Move test
mv packages/core/src/services/__tests__/agent-event-service.test.ts \
   packages/core/src/agent-observability/__tests__/
```

### Update Imports (Example)
```bash
# Find all imports of the moved service
grep -r "from.*services/agent-event-service" packages/core/src

# Update each file
# Old: import { AgentEventService } from '../services/agent-event-service.js';
# New: import { AgentEventService } from '../agent-observability/events/agent-event-service.js';
```

## 🚨 Risk Mitigation

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing imports | High | Maintain backward compatibility via services/index.ts |
| Circular dependencies | Medium | Move in dependency order, validate after each move |
| Test failures | Medium | Update test imports immediately after moving files |
| Build failures | High | Build after each service move, fix before continuing |
| External package issues | Low | MCP and Web packages use services via server.ts exports |

### Rollback Strategy

If issues arise:
1. Each service move is a separate commit
2. Can revert individual service moves
3. Backward compatibility ensures old imports still work
4. Services left in original locations continue to function

## 📈 Success Metrics

- [x] All 6 services successfully moved to new locations
- [x] Zero breaking changes to public API
- [x] All tests passing (unit, integration) - no new failures
- [x] All builds successful (core, mcp, web)
- [x] Import validation passing
- [x] Code organization matches mental model
- [x] Documentation reflects new structure

## 🔗 Related Documents

- [Phase 1: Quick Wins](./QUICK_WINS.md) - Completed ✅
- [Reorganization Plan](./REORGANIZATION_PLAN.md) - Master plan
- [README](./README.md) - Overall status

## 📝 Notes

### Key Decisions

1. **Move services incrementally** - One at a time to minimize risk ✅
2. **Maintain backward compatibility** - services/index.ts continues to work ✅
3. **Update imports progressively** - Fix imports as we go ✅
4. **Test after each move** - Validate before moving to next service ✅
5. **Keep shared services in place** - Auth, SSO, LLM remain in services/ ✅

### Implementation Notes

- **Test files**: Moved to centralized `__tests__` directories at module level
- **Import paths**: All updated to use relative paths with `.js` extensions
- **Backward compatibility**: All services remain accessible through `services/index.ts`
- **No breaking changes**: External packages continue to work without modification

### Resolved Questions

- ✅ Test files moved to centralized `__tests__` at module level (not subdirectories)
- ✅ Backward compatibility maintained indefinitely (no breaking changes needed)
- ✅ No deprecation warnings needed (re-exports are transparent)

---

**Created**: October 21, 2025  
**Phase 1 Completed**: October 21, 2025  
**Phase 2 Started**: October 21, 2025  
**Phase 2 Completed**: October 21, 2025  
**Actual Duration**: ~2 hours
