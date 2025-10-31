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

## 📋 Specifications (Specs) - Development Tracking SOP

### Overview

Specifications (specs) follow **Spec-Driven Development (SDD)** - document design before implementation. 

**Terminology**: "Specs", "dev docs", and "development documentation" are interchangeable aliases.

### When to Create a Spec

Create a spec when starting:
- Significant features requiring design/planning (>2 days work)
- Architectural decisions affecting multiple components
- Complex features needing documentation
- Breaking changes or major refactors

**Don't create specs for**: Small bug fixes, minor tweaks, routine maintenance, simple one-file changes.

### Directory Structure

**Multi-tier hierarchy**: `specs/YYYYMMDD/NNN-short-name/`

- **Level 1**: `YYYYMMDD/` - Date folder (when spec design begins)
- **Level 2**: `NNN-short-name/` - Numbered spec within that date
  - `NNN` starts from `001` within each date
  - `short-name` is brief, hyphenated (e.g., `database-architecture`)

**Example**:
```
specs/
├── 20251031/
│   ├── 001-database-architecture/
│   ├── 002-project-hierarchy/
│   └── 003-api-refactor/
└── 20251101/
    └── 001-auth-system/
```

### Creating Specs

```bash
# Create new spec (auto-increments NNN)
pnpm spec create "short-name" "Optional Title"

# Example
pnpm spec create "database-architecture" "Database Architecture Design"
# Creates: specs/20251031/001-database-architecture/

# List active specs
pnpm spec list

# Archive completed spec
pnpm spec archive 20251031 001-database-architecture
```

### Spec Content

**Recommended structure** (not mandatory):
- `design.md` - Full technical design specification
- `README.md` or `summary.md` - Quick overview
- `implementation.md` or `checklist.md` - Implementation tasks
- `reference.md` - Quick reference for completed features

**Status indicators**: 📅 Planned | 🚧 In Progress | ✅ Complete | ⏸️ Paused | ❌ Cancelled