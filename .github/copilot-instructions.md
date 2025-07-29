# Devlog Project - Copilot Instructions

## 🎯 Core Instruction System

This file applies **Occam's razor principle** - the simplest solution that works is the best solution. All development patterns, architecture decisions, and coding standards are consolidated here as a single, focused source of truth.

## Development Philosophy

**IMPORTANT**: This project prioritizes clean, modern architecture over backwards compatibility.

- **Quality over continuity**: Well-architected solutions over preserving broken legacy code
- **Rapid iteration**: Make bold changes to improve codebase structure  
- **Breaking changes acceptable**: Not bound by API compatibility during early development
- **Simple is better**: Occam's razor applied to all technical decisions

## 🎯 Essential Patterns

- **Architecture**: Use `DevlogService` and `ProjectService` singleton patterns
- **Imports**: Add `.js` extensions to relative imports, use `@codervisor/devlog-*` for cross-package
- **TypeScript**: No `any` types, proper error handling, constructor dependency injection
- **Testing**: Mock externals, test success/failure paths, isolated tests
- **React**: Functional components, Server Components by default, Tailwind utilities

## 🚨 Critical Development Requirements

### Temporary Files
- **Use `tmp/` folder**: All experimental code, test scripts, and temporary files
- **Not committed**: `tmp/` is gitignored for transient work

### Build Testing
- **Use `pnpm build:test`**: Tests builds without breaking active dev servers
- **Development containers**: `docker compose -f docker-compose.dev.yml up web-dev -d --wait`
- **Build order**: Core → MCP → Web (follow dependency chain)

### UI Development
- **Use Playwright MCP tools**: Required for React debugging and console monitoring
- **Keep containers running**: Don't stop development containers unless explicitly requested

### Quality Standards
- **No `any` types**: Use proper TypeScript typing
- **Handle async errors**: All async operations must have error handling
- **Test critical paths**: Both success and failure scenarios
- **Export types**: Always export types alongside implementations

## 📖 Remember

Simple, focused solutions over complex, comprehensive ones. When in doubt, choose the clearer, more maintainable approach.
