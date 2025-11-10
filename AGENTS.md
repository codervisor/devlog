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

## 📋 LeanSpec - Lightweight Specification Management

**Philosophy**: Lightweight spec methodology for AI-powered development. Clarity over documentation.

### Core Principles

1. **Read README.md first** - Understand project context before starting
2. **Check specs/** - Review existing specs to avoid duplicate work
3. **Keep it minimal** - If it doesn't add clarity, cut it
4. **Stay in sync** - Specs evolve with implementation

### When to Create a Spec

**Create specs for:**

- Features requiring design/planning (>2 days work)
- Features that affect multiple parts of the system
- Architectural decisions affecting multiple components
- Breaking changes or significant refactors
- Design decisions needing team alignment
- Complex features benefiting from upfront thinking

**Skip specs for:**

- Bug fixes
- Trivial changes
- Routine maintenance
- Self-explanatory refactors
- Simple one-file changes

### Discovery

Before starting work, understand project context:

```bash
# View Kanban board (best starting point)
lspec board

# Show statistics and velocity
lspec stats

# Find specs by tag
lspec list --tag api

# Full-text search
lspec search "<query>"

# View a spec
lspec view NNN

# Check dependencies
lspec deps NNN
```

Use `lspec` commands to quickly understand what exists, what's in progress, and what depends on what.

### Spec Frontmatter

Include YAML frontmatter at the top of spec markdown files:

```yaml
---
status: planned|in-progress|complete|archived
created: YYYY-MM-DD
tags: [tag1, tag2] # helps with discovery
priority: low|medium|high # helps with planning
assignee: username # for team coordination
---
```

**Required fields**: `status`, `created`  
**Helpful fields**: `tags` (discovery), `priority` (planning)

**Update status**:

```bash
lspec update NNN --status in-progress
lspec update NNN --priority high
lspec update NNN --assignee yourname
```

### Workflow

1. **Discover context** - Run `lspec board` to see current state
2. **Search existing specs** - Use `lspec search` or `lspec list` to find relevant work
3. **Check dependencies** - Run `lspec deps NNN` if working on existing spec
4. **Create or update spec** - Use `lspec create` or `lspec update`
5. **Implement changes** - Keep spec in sync as you learn
6. **Update status** - `lspec update NNN --status in-progress` then `--status complete`
7. **Archive when done** - `lspec archive NNN` moves to archive

### Quality Standards

- Code is clear and maintainable
- Tests cover critical paths
- No unnecessary complexity
- Documentation where needed (not everywhere)
- Specs stay in sync with implementation
