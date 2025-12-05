# Devlog Project - AI Agent Guidelines

## 🎯 Core Principles

**Occam's Razor**: Simple solutions are better than complex ones.

- **Quality over continuity**: Well-architected solutions over preserving legacy
- **Breaking changes acceptable**: Not bound by API compatibility in early development
- **TypeScript everywhere**: Type safety is non-negotiable

## 🚨 Critical Rules (Never Break These)

- ✅ Add `.js` extensions to relative imports (ESM requirement)
- ✅ Handle all async operations with error handling
- ❌ Never use `any` type without explicit justification
- ❌ Never ignore error handling in async operations

## 📁 Development Workflow

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

---

## 📋 LeanSpec - Specification Management

**Philosophy**: Lightweight spec methodology for AI-powered development. Clarity over documentation.

### 🚨 CRITICAL: Before ANY Task

**STOP and check these first:**

1. **Discover context** → Use `board` tool to see project state
2. **Search for related work** → Use `search` tool before creating new specs
3. **Never create files manually** → Always use `create` tool for new specs

> **Why?** Skipping discovery creates duplicate work. Manual file creation breaks LeanSpec tooling.

### First Principles (Priority Order)

1. **Context Economy** - <2,000 tokens optimal, >3,500 needs splitting
2. **Signal-to-Noise** - Every word must inform a decision
3. **Intent Over Implementation** - Capture why, let how emerge
4. **Bridge the Gap** - Both human and AI must understand
5. **Progressive Disclosure** - Add complexity only when pain is felt

### When to Create a Spec

| ✅ Write spec                              | ❌ Skip spec               |
| ------------------------------------------ | -------------------------- |
| Multi-part features (>2 days work)         | Bug fixes                  |
| Breaking changes                           | Trivial changes            |
| Design decisions                           | Self-explanatory refactors |
| Architecture affecting multiple components | Simple one-file changes    |

### 🔧 Managing Specs

#### MCP Tools (Preferred) with CLI Fallback

| Action         | MCP Tool | CLI Fallback                                   |
| -------------- | -------- | ---------------------------------------------- |
| Project status | `board`  | `lean-spec board`                              |
| List specs     | `list`   | `lean-spec list`                               |
| Search specs   | `search` | `lean-spec search "query"`                     |
| View spec      | `view`   | `lean-spec view <spec>`                        |
| Create spec    | `create` | `lean-spec create <name>`                      |
| Update spec    | `update` | `lean-spec update <spec> --status <status>`    |
| Link specs     | `link`   | `lean-spec link <spec> --depends-on <other>`   |
| Unlink specs   | `unlink` | `lean-spec unlink <spec> --depends-on <other>` |
| Dependencies   | `deps`   | `lean-spec deps <spec>`                        |
| Token count    | `tokens` | `lean-spec tokens <spec>`                      |

### ⚠️ Core Rules

| Rule                                | Details                                                                                                               |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **NEVER edit frontmatter manually** | Use `update`, `link`, `unlink` for: `status`, `priority`, `tags`, `assignee`, `transitions`, timestamps, `depends_on` |
| **ALWAYS link spec references**     | Content mentions another spec → `lean-spec link <spec> --depends-on <other>`                                          |
| **Track status transitions**        | `planned` → `in-progress` (before coding) → `complete` (after done)                                                   |
| **No nested code blocks**           | Use indentation instead                                                                                               |

### 🚫 Common Mistakes

| ❌ Don't                   | ✅ Do Instead                         |
| -------------------------- | ------------------------------------- |
| Create spec files manually | Use `create` tool                     |
| Skip discovery             | Run `board` and `search` first        |
| Leave status as "planned"  | Update to `in-progress` before coding |
| Edit frontmatter manually  | Use `update` tool                     |

### 📋 SDD Workflow

```
BEFORE: board → search → check existing specs
DURING: update status to in-progress → code → document decisions → link dependencies
AFTER:  update status to complete → document learnings
```

**Status tracks implementation, NOT spec writing.**

### Spec Dependencies

Use `depends_on` to express blocking relationships between specs:

- **`depends_on`** = True blocker, work order matters, directional (A depends on B)

Link dependencies when one spec builds on another:

```bash
lean-spec link <spec> --depends-on <other-spec>
```

### Token Thresholds

| Tokens      | Status                |
| ----------- | --------------------- |
| <2,000      | ✅ Optimal            |
| 2,000-3,500 | ✅ Good               |
| 3,500-5,000 | ⚠️ Consider splitting |
| >5,000      | 🔴 Must split         |

### Quality Standards

- Code is clear and maintainable
- Tests cover critical paths
- No unnecessary complexity
- Documentation where needed (not everywhere)
- Specs stay in sync with implementation

---

**Remember:** LeanSpec tracks what you're building. Keep specs in sync with your work!
