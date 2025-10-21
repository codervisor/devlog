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