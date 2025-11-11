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

### Directory Structure

**Multi-tier hierarchy**: `specs/YYYYMMDD/NNN-short-name/`

```
specs/
├── 20251031/
│   ├── 001-database-architecture/
│   ├── 002-project-hierarchy/
│   └── 003-api-refactor/
└── 20251101/
    └── 001-auth-system/
```

### Discovery Commands

Before starting work, understand project context:

```bash
# View work distribution
lean-spec stats

# See specs by status
lean-spec board

# Find specs by tag
lean-spec list --tag=api

# Full-text search
lean-spec search "<query>"

# Check dependencies
lean-spec deps <spec>
```

These commands help you understand what exists, what's in progress, and what depends on what.

### Spec Frontmatter

Include YAML frontmatter at the top of spec markdown files:

```yaml
---
status: draft|planned|in-progress|complete|blocked|cancelled
created: YYYY-MM-DD
tags: [tag1, tag2]
priority: low|medium|high
assignee: username
---
```

**Core fields:**

- `status` and `created` are required
- `tags` help with discovery and organization
- `priority` helps teams plan work
- `assignee` shows who's working on what

### Workflow

1. **Discover context** - Run `lean-spec stats` or `lean-spec board` to see current state
2. **Search existing specs** - Use `lean-spec search` or `lean-spec list` to find relevant work
3. **Check dependencies** - Run `lean-spec deps <spec>` if working on existing spec
4. **Create or update spec** - Add frontmatter with required fields and helpful metadata
5. **Implement changes** - Keep spec in sync as you learn
6. **Update status** - Mark progress: `draft` → `in-progress` → `complete`
7. **Archive when done** - `lean-spec archive <spec>` moves to archive

### Update Commands

```bash
# Update spec status
lean-spec update <spec> --status in-progress --assignee yourname

# Or edit frontmatter directly in the markdown file
```

### Quality Standards

- Code is clear and maintainable
- Tests cover critical paths
- No unnecessary complexity
- Documentation where needed (not everywhere)
- Specs stay in sync with implementation

---

**Remember**: LeanSpec is a mindset. Adapt these guidelines to what actually helps.
