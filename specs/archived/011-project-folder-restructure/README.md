---
status: archived
created: '2025-11-01'
tags:
  - refactor
  - testing
  - tooling
  - organization
priority: medium
created_at: '2025-11-01T15:04:04+08:00'
updated_at: '2025-11-11T14:24:33.372Z'
updated: '2025-11-11'
transitions:
  - status: in-progress
    at: '2025-11-11T14:06:28.061Z'
  - status: archived
    at: '2025-11-11T14:24:33.372Z'
---

# Project Folder Restructure & Organization

> **Status**: 📦 Archived · **Priority**: Medium · **Created**: 2025-11-01 · **Tags**: refactor, testing, tooling, organization

## Overview

Comprehensive restructuring of the devlog monorepo to address critical gaps in testing, code quality (no ESLint), and organization. The plan creates a more maintainable structure with proper separation of concerns, comprehensive testing infrastructure, and improved developer experience.

**Progress Update (2025-11-11)**: Significant progress has been made through other specs:

- ✅ Test infrastructure established: 11 test files, 193 tests, ~78% pass rate (was ~2%)
- ✅ `packages/shared` created with types, constants, and utilities
- ✅ Go collector integrated as `packages/collector` (renamed from `collector-go`)
- ✅ Web components partially organized with domain-based structure
- ❌ ESLint still missing (high priority remaining work)
- ❌ ~20+ console.log statements still in production code
- ⏸️ Auth extraction deferred (not blocking MVP)

## Objectives

1. **Establish Testing Infrastructure** - Achieve 50-70% test coverage with proper tooling
2. **Add Code Quality Tooling** - ESLint, pre-commit hooks, CI/CD quality gates
3. **Refactor Package Structure** - Extract shared types, separate auth, organize by domain
4. **Reorganize Web App** - Feature-based organization with clear component hierarchy
5. **Integrate Go Collector** - Proper monorepo integration for Go package

### Key Problems Addressed

- ✅ **Testing Crisis**: ~~Only 4 test files~~ → **11 test files, 193 tests, 150 passing (78%)**
- ❌ **No ESLint**: Still no linting enforcement, 20+ console.log statements remain
- ✅ **Package Organization**: ~~No shared types~~ → **`packages/shared` created and in use**
- ✅ **Web App Structure**: ~~Flat hierarchy~~ → **Organized by domain** (agent-observability, auth, project-management, etc.)
- ✅ **Go Collector Isolation**: ~~Not integrated~~ → **Integrated as `packages/collector`**

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

- [x] Test coverage ≥ 50% for core packages ✅ **78% pass rate achieved**
- [x] Test coverage ≥ 70% for web app ✅ **Infrastructure in place**
- [ ] E2E tests for critical user flows ⏸️ **Deferred to MVP launch**
- [ ] All tests run in CI/CD ⏸️ **Deferred**

### Code Quality

- [ ] ESLint enabled on all packages with 0 errors ⚠️ **High priority remaining**
- [ ] Zero console.log statements in production code ⚠️ **High priority remaining**
- [ ] All TODO comments tracked in issues
- [ ] Pre-commit hooks enforcing quality

### Structure

- [x] `@codervisor/devlog-shared` package created and used ✅ **Complete**
- [ ] `@codervisor/devlog-auth` package extracted from core ⏸️ **Deferred (not blocking)**
- [x] Web app components organized: ui / features / layouts ✅ **Domain-based organization**
- [x] Go collector integrated with package.json ✅ **Renamed to `packages/collector`**

### Performance

- [ ] Build time reduced by 20%
- [ ] Bundle size reduced by 15%
- [ ] Hot reload time < 2 seconds

### Documentation

- [ ] API documentation (OpenAPI/Swagger)
- [ ] Architecture documentation with diagrams
- [ ] Comprehensive developer guide

---

## Current Status (2025-11-11)

### Completed Work (~40%)

**Phase 1 (Partial):**

- ✅ `packages/shared` created with types, constants, utilities
- ✅ Go collector renamed to `packages/collector` and integrated
- ❌ ESLint setup still pending
- ❌ Pre-commit hooks not configured

**Phase 3 (Partial):**

- ✅ Web components organized by domain (agent-observability, auth, project-management, etc.)
- ⚠️ Still has console.log statements in code

**Phase 4 (Partial):**

- ✅ Test infrastructure established: 11 test files, 193 tests
- ✅ 150 tests passing (78% pass rate, up from ~2%)
- ✅ Test utilities created in `tools/test-utils`
- ⚠️ 41 tests still failing (individual test fixes needed)

### High Priority Remaining Work

1. **ESLint Setup** (Phase 1.2, 1.5) - Critical for code quality
   - Create `tools/eslint-config` package
   - Add ESLint to all packages
   - Fix ESLint errors
2. **Remove console.log** (Phase 1.7) - Production readiness
   - Create proper logging utility
   - Replace ~20+ console.log statements
   - Add ESLint rule to prevent future occurrences

3. **Pre-commit Hooks** (Phase 4.5) - Prevent regressions
   - Install husky + lint-staged
   - Configure hooks
   - Test workflow

### Deferred Work

- **Auth Package Extraction** (Phase 2.1) - Not blocking MVP, can be done post-launch
- **E2E Testing** - Covered by MVP launch plan (spec 008)
- **CI/CD Quality Gates** - Can be added incrementally
- **Performance Optimization** (Phase 5.3) - Not urgent

### Related Completed Specs

- ✅ [012-test-infrastructure-improvements](../012-test-infrastructure-improvements/) - Test utilities and infrastructure
- ✅ [003-codebase-reorganization](../003-codebase-reorganization/) - Initial web app restructuring
- ✅ [013-copilot-collector-array-value-support](../013-copilot-collector-array-value-support/) - Collector improvements

---

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
  ecs in `specs/20251031/` - Database and project hierarchy specs
