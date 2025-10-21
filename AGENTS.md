# Devlog Project - AI Agent Guidelines

## 🎯 Core Principles

**Occam's Razor**: Simple solutions are better than complex ones.

- **Quality over continuity**: Well-architected solutions over preserving legacy
- **Breaking changes acceptable**: Not bound by API compatibility in early development
- **TypeScript everywhere**: Type safety is non-negotiable

## 🚨 Critical Rules (Never Break These)

- ✅ Add `.js` extensions to relative imports (ESM requirement)
- ✅ Use `DevlogService` and `ProjectService` singleton patterns
- ✅ Handle all async operations with error handling
- ❌ Never use `any` type without explicit justification
- ❌ Never ignore error handling in async operations

## 📁 Development Workflow

- **Temp files**: Use `tmp/` folder for experiments (gitignored)
- **Build packages**: Use `pnpm build` (builds all packages)
- **Containers**: `docker compose up web-dev -d --wait`
- **Validating**: Use `pnpm validate`
- **Testing**: Use `pnpm test`

## 🎯 Essential Patterns

- **Architecture**: Singleton services with `initialize()` and `dispose()`
- **Imports**: `@codervisor/devlog-*` cross-package, `./path.js` internal
- **React**: Functional components, Server Components default, Tailwind utilities
- **Testing**: Mock externals, test success/failure paths

## 📖 Decision Framework

1. Is there a recommended approach? → Use it
2. Does it maintain type safety? → Non-negotiable
3. Is it the simplest solution? → Occam's razor test

## 📋 Development Tracking SOP

### Feature Documentation (docs/dev/)
- **When to create**: Starting significant features requiring design/planning
- **Folder naming**: `docs/dev/YYYYMMDD-feature-name/` (use date when design begins)
- **Required docs**: At minimum, one primary design document
- **Status tracking**: Mark status clearly (Design, In Progress, Complete, Paused)

## 🔍 Agent Observability Workflow

### When Monitoring AI Agent Sessions (Primary Feature)

This is the core use case of the Devlog platform - tracking and analyzing AI coding agent activities.

```typescript
// Before any AI coding work - start a session
mcp_agent_start_session({
  agentId: "github-copilot",
  projectId: 1,
  objective: "Implement user authentication",
  workItemId: 123  // Optional: link to work item if tracking
});

// During work - events logged automatically by collector
// Or manually log significant events
mcp_agent_log_event({
  type: "file_write",
  filePath: "src/auth/login.ts",
  metrics: { linesAdded: 45, tokensUsed: 1200 }
});

// After work completes - end the session
mcp_agent_end_session({
  outcome: "success",
  summary: "Implemented JWT-based auth with tests"
});

// Query and analyze agent performance
mcp_agent_query_events({
  sessionId: "session-id",
  eventTypes: ["file_write", "llm_request"]
});
```

### When Managing Work Items (Optional Supporting Feature)

Work items help organize and contextualize agent sessions, but are not required.

```typescript
// Create a work item to organize work
mcp_work_item_create({
  title: "Implement user authentication",
  type: "feature",
  description: "Add JWT-based authentication system"
});

// Update progress
mcp_work_item_update({
  id: 123,
  status: "in-progress",
  note: "Completed login endpoint"
});

// Link agent sessions to work items
// Sessions can reference workItemId when started
```

**Note**: The terminology "work item" is an alias for "devlog entry" - both are interchangeable. New code should prefer `WorkItem` type, but `DevlogEntry` remains fully supported for backward compatibility.