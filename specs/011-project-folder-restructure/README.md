---
status: planned
created: '2025-11-01'
tags:
  - refactor
  - testing
  - tooling
  - organization
priority: medium
created_at: '2025-11-01T15:04:04+08:00'
updated_at: '2025-11-10T02:59:33.493Z'
updated: '2025-11-10'
---

# Project Folder Restructure & Organization

> **Status**: 🗓️ Planned · **Priority**: Medium · **Created**: 2025-11-01 · **Tags**: refactor, testing, tooling, organization

**Status**: 📅 Planned  
**Created**: 2025-11-01  
**Spec**: `20251101/001-project-folder-restructure`

## Overview

Comprehensive restructuring of the devlog monorepo to address critical gaps in testing (2% coverage), code quality (no ESLint), and organization. The plan creates a more maintainable structure with proper separation of concerns, comprehensive testing infrastructure, and improved developer experience.

This spec includes the Go collector package (`packages/collector-go`) which needs proper integration into the monorepo tooling.

## Objectives

1. **Establish Testing Infrastructure** - Achieve 50-70% test coverage with proper tooling
2. **Add Code Quality Tooling** - ESLint, pre-commit hooks, CI/CD quality gates
3. **Refactor Package Structure** - Extract shared types, separate auth, organize by domain
4. **Reorganize Web App** - Feature-based organization with clear component hierarchy
5. **Integrate Go Collector** - Proper monorepo integration for Go package

### Key Problems Addressed

- **Testing Crisis**: Only 4 test files for 212 TypeScript files (~2% coverage)
- **No ESLint**: No linting enforcement, 20+ console.log statements in production
- **Package Organization**: Core overloaded, no shared types, unclear boundaries
- **Web App Structure**: Flat hierarchy, mixed concerns, no feature organization
- **Go Collector Isolation**: Not integrated into monorepo tooling

## Design

See **[design.md](./design.md)** for complete technical design including:

- Detailed proposed structure for all packages
- New packages: `shared`, `auth`, and `tools/*`
- Refactored `core` and `web` app structure
- Go collector monorepo integration
- Migration strategy with 5 phases
- Risk assessment and mitigation

## Implementation Plan

See **[implementation.md](./implementation.md)** for detailed task breakdown with:

- **Phase 1**: Foundation (Week 1) - Tooling, new packages, ESLint
- **Phase 2**: Core Refactoring (Week 2) - Extract auth, refactor core
- **Phase 3**: Web App Restructure (Week 3) - Components, routes, organization
- **Phase 4**: Testing & Quality (Week 4) - Tests, coverage, CI/CD
- **Phase 5**: Documentation & Polish (Week 5) - API docs, architecture, optimization

Each phase has detailed checklists with specific tasks.

## Success Criteria

### Testing

- [ ] Test coverage ≥ 50% for core packages
- [ ] Test coverage ≥ 70% for web app
- [ ] E2E tests for critical user flows
- [ ] All tests run in CI/CD

### Code Quality

- [ ] ESLint enabled on all packages with 0 errors
- [ ] Zero console.log statements in production code
- [ ] All TODO comments tracked in issues
- [ ] Pre-commit hooks enforcing quality

### Structure

- [ ] `@codervisor/devlog-shared` package created and used
- [ ] `@codervisor/devlog-auth` package extracted from core
- [ ] Web app components organized: ui / features / layouts
- [ ] Go collector integrated with package.json

### Performance

- [ ] Build time reduced by 20%
- [ ] Bundle size reduced by 15%
- [ ] Hot reload time < 2 seconds

### Documentation

- [ ] API documentation (OpenAPI/Swagger)
- [ ] Architecture documentation with diagrams
- [ ] Comprehensive developer guide

## Timeline

**Total**: 5 weeks (25 working days)

- Week 1: Foundation & tooling
- Week 2: Core refactoring
- Week 3: Web app restructure
- Week 4: Testing & quality
- Week 5: Documentation & polish

## References

- [AGENTS.md](../../../AGENTS.md) - AI Agent development guidelines
- [Project Analysis](./design.md#current-problems) - Detailed problem analysis
- [CONTRIBUTING.md](../../../CONTRIBUTING.md) - Contribution guidelines
- Related specs in `specs/20251031/` - Database and project hierarchy specs
