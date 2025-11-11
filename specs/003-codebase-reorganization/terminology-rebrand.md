# Terminology Rebranding - Making it Intuitive

**Issue**: "Devlog entry" is confusing and unintuitive for common developers  
**Goal**: Choose terminology that's familiar and immediately understandable

## 🎯 The Problem

"Devlog entry" creates confusion:

- ❌ Not industry-standard terminology
- ❌ Sounds like a "development log" (diary) rather than work tracking
- ❌ "Entry" is vague - entry into what?
- ❌ Not immediately clear it's for tracking work items

## 💡 Industry-Standard Alternatives

### Option 1: **Work Item** (Recommended ⭐)

**Pros:**

- ✅ Industry standard (Azure DevOps, GitHub Projects)
- ✅ Neutral - works for any type of work
- ✅ Immediately understandable
- ✅ Flexible - can be task, feature, bug, etc.
- ✅ Aligns with AI agent observability (agents work on "work items")

**Usage:**

```typescript
// Types
interface WorkItem { ... }
type WorkItemType = 'feature' | 'bugfix' | 'task' | 'refactor' | 'docs';
type WorkItemStatus = 'new' | 'in-progress' | 'done' | ...;

// API
POST /api/projects/{id}/work-items
GET /api/projects/{id}/work-items/{itemId}

// MCP Tools
mcp_work_item_create
mcp_work_item_update
mcp_work_item_list

// Database
work_items (table)
work_item_notes (table)
```

**Marketing:**

- "Track work items alongside AI agent activities"
- "Organize agent sessions by work item"
- "See which work items your AI agents are helping with"

---

### Option 2: **Task**

**Pros:**

- ✅ Simple and clear
- ✅ Everyone knows what a task is
- ✅ Short and concise

**Cons:**

- ⚠️ Might feel too specific (what about features, bugs?)
- ⚠️ Already one of our "types" (task vs feature vs bug)

**Usage:**

```typescript
interface Task { ... }
type TaskType = 'feature' | 'bugfix' | 'task' | 'refactor' | 'docs';

// Could be confusing: "task of type 'feature'"
```

---

### Option 3: **Issue**

**Pros:**

- ✅ Industry standard (GitHub Issues, Jira, GitLab)
- ✅ Widely recognized
- ✅ Works well with "bug" context

**Cons:**

- ⚠️ Implies problems/bugs (not great for features)
- ⚠️ Less neutral than "work item"

**Usage:**

```typescript
interface Issue { ... }
// POST /api/projects/{id}/issues
```

---

### Option 4: **Ticket**

**Pros:**

- ✅ Industry standard (Jira, ServiceNow)
- ✅ Clear tracking connotation

**Cons:**

- ⚠️ More corporate/support desk feel
- ⚠️ Less developer-friendly

---

### Option 5: **Story** (User Story)

**Pros:**

- ✅ Agile methodology standard
- ✅ Works well for feature work

**Cons:**

- ⚠️ Too specific to Agile
- ⚠️ Doesn't work well for bugs/tasks
- ⚠️ Implies user-facing features only

---

## 🏆 Recommendation: "Work Item"

**Rationale:**

1. **Most versatile**: Works for features, bugs, tasks, refactors, docs
2. **Industry standard**: Used by Azure DevOps, GitHub Projects
3. **Agent observability alignment**: "Agents help you complete work items"
4. **Clear hierarchy**: Projects → Work Items → Agent Sessions
5. **Developer-friendly**: Intuitive without being corporate

### Mental Model

```
Project: "Mobile App"
├── Work Item #123: "Implement user authentication"
│   ├── Type: feature
│   ├── Status: in-progress
│   └── Agent Sessions:
│       ├── Session A: GitHub Copilot (2 hours)
│       └── Session B: Claude Code (1 hour)
├── Work Item #124: "Fix login timeout bug"
│   ├── Type: bugfix
│   └── ...
```

## 📋 Migration Strategy

### Phase 1: Introduce Dual Terminology (Week 1)

Keep "devlog" internally but introduce "work item" in user-facing areas:

- Documentation uses "work item" primarily
- UI shows "Work Items" but code still uses `DevlogEntry`
- API accepts both terms (aliases)

### Phase 2: Gradual Code Migration (Weeks 2-4)

- Create type aliases: `type WorkItem = DevlogEntry`
- Add new exports alongside old ones
- Update internal code incrementally
- Keep backward compatibility

### Phase 3: Deprecation (Future)

- Mark `DevlogEntry` as deprecated
- Encourage migration to `WorkItem`
- Eventually remove old terminology (v2.0)

## 🔄 Terminology Mapping

### Current → New

| Current        | New               | Notes          |
| -------------- | ----------------- | -------------- |
| Devlog entry   | Work item         | Primary change |
| DevlogEntry    | WorkItem          | Type interface |
| devlog_entries | work_items        | Database table |
| create_devlog  | create_work_item  | MCP tool       |
| /api/devlogs   | /api/work-items   | API route      |
| Devlog list    | Work items        | UI             |
| Entry details  | Work item details | UI             |

### Keep as-is (Don't Change)

| Term          | Reason        |
| ------------- | ------------- |
| Project       | Already clear |
| Agent Session | Already clear |
| Agent Event   | Already clear |
| Note          | Already clear |
| Document      | Already clear |

## 💬 User Communication

### Documentation Updates

**Before:**

> "Create devlog entries to track your development work"

**After:**

> "Create work items to track features, bugs, and tasks"

**Before:**

> "Devlog entries help organize your coding activities"

**After:**

> "Work items help organize your development activities and connect them to AI agent sessions"

### UI Copy Updates

**Before:**

```
+ New Devlog Entry
Devlog #123: Implement auth
```

**After:**

```
+ New Work Item
Work Item #123: Implement auth
```

## 🎨 Branding Considerations

### Product Name: Keep "Devlog"

The product name "devlog" can stay - it's the brand. We're just clarifying what the **items** within it are called.

**Analogy:**

- **Jira** (product) tracks **issues** (items)
- **GitHub** (product) has **issues** (items)
- **Devlog** (product) tracks **work items** (items)

### Marketing Copy

- "Devlog: AI Agent Observability Platform"
- "Track work items and AI agent activities in one place"
- "See which work items your AI agents are helping with"
- "Connect agent sessions to work items for complete traceability"

## 🚀 Implementation Checklist

### Documentation (Quick - 2-3 hours)

- [ ] Update main README.md to use "work item"
- [ ] Update AGENTS.md examples
- [ ] Update API documentation
- [ ] Update user guides

### Code (Gradual - can span multiple PRs)

- [ ] Add `WorkItem` type alias to `core/types`
- [ ] Export both `DevlogEntry` and `WorkItem`
- [ ] Add JSDoc comments explaining the rename
- [ ] Update UI components to display "Work Item"
- [ ] Update API routes (keep backward compatibility)
- [ ] Update MCP tools (add aliases)

### Database (Later - requires migration)

- [ ] Plan table rename strategy
- [ ] Consider views/aliases for transition
- [ ] Create migration scripts
- [ ] Update all queries

## ❓ Open Questions

1. **Timeline**: How quickly do we want to complete this?
   - Option A: Quick (documentation only, 1 week)
   - Option B: Gradual (code + docs, 4 weeks)
   - Option C: Complete (including DB, 8 weeks)

2. **Breaking Changes**: How do we handle them?
   - Option A: No breaking changes (always support both)
   - Option B: Deprecation path (support both, warn, then remove)
   - Option C: Clean break (document migration, ship v2.0)

3. **Brand Identity**: Does "devlog" as a product name still work?
   - Option A: Keep "Devlog" (it's established)
   - Option B: Rebrand product too (bigger undertaking)
   - Option C: Evolve to "Devlog Agent Observatory" or similar

## 📝 Next Steps

1. **Get consensus** on terminology choice
2. **Decide on migration strategy** (quick vs. gradual)
3. **Start with documentation** (lowest risk, highest impact)
4. **Plan code migration** (type aliases first)
5. **Consider database changes** (much later)

---

**Recommendation**: Start with "work item" terminology in documentation and UI immediately. Gradually migrate code over time. Keep backward compatibility throughout.
