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
- **Build testing**: Use `pnpm build:test` (doesn't break dev servers)
- **Containers**: `docker compose -f docker-compose.dev.yml up web-dev -d --wait`
- **Build order**: Core → MCP → Web (dependency chain)

### Task Tracking
- **Always start by checking**: Search related devlogs before starting ANY new work
- **Must create devlogs**: For features, refactoring, or multi-step work (>30min)
- **Required progress updates**: Add notes after successful builds, major changes, or blockers
- **Always complete**: Document learnings and close devlogs when work is finished

## 🎯 Essential Patterns

- **Architecture**: Singleton services with `initialize()` and `dispose()`
- **Imports**: `@codervisor/devlog-*` cross-package, `./path.js` internal
- **React**: Functional components, Server Components default, Tailwind utilities
- **Testing**: Mock externals, test success/failure paths

## 📖 Decision Framework

1. Is there a recommended approach? → Use it
2. Does it maintain type safety? → Non-negotiable
3. Is it the simplest solution? → Occam's razor test