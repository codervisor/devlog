# Project Folder Restructure & Organization

**Status**: 📅 Planned  
**Created**: 2025-11-01  
**Author**: AI Agent (based on codebase analysis)

## Overview

Comprehensive restructuring of the devlog monorepo to improve maintainability, testability, and developer experience. This addresses critical gaps identified in the project analysis, including poor test coverage, missing code quality tooling, and organizational inconsistencies.

## Current Problems

### 1. Testing Crisis
- **Web app**: Only 4 test files for 212 source files (~2% coverage)
- **No testing infrastructure**: Missing test utilities, fixtures, mocks
- **No E2E tests**: Critical user flows untested
- **Inconsistent patterns**: Tests scattered across packages

### 2. Code Quality Gaps
- **No ESLint**: No linting enforcement across the codebase
- **Console.logs in production**: 20+ instances of debug logs
- **No pre-commit hooks**: Quality gates not enforced
- **Untracked TODOs**: 4+ TODO comments without tracking

### 3. Package Organization Issues
- **Core package overloaded**: Mixing auth, services, types, utils
- **No shared types package**: Types duplicated across packages
- **Unclear boundaries**: Hard to know what depends on what
- **Go collector isolated**: Not integrated into monorepo tooling

### 4. Web App Structure
- **Flat component hierarchy**: All components mixed together
- **No feature organization**: Hard to find related components
- **Mixed concerns in lib/**: Services, hooks, utils all together
- **No clear patterns**: Inconsistent import/export patterns

### 5. Documentation & Tooling
- **Missing architecture docs**: No clear system design
- **No API documentation**: 30+ API routes undocumented
- **Build complexity**: Webpack config overly complex
- **No performance monitoring**: No bundle analysis or metrics

## Proposed Structure

### Root Level Organization

```
devlog/
├── apps/
│   └── web/                          # Next.js web application
├── packages/
│   ├── shared/                       # NEW: Shared types & utilities (zero deps)
│   ├── core/                         # REFACTOR: Business logic only
│   ├── auth/                         # NEW: Authentication logic
│   ├── ai/                           # KEEP: AI analysis & insights
│   ├── mcp/                          # KEEP: MCP server
│   └── collector/                    # RENAME: Go collector (was collector-go)
├── tools/                            # NEW: Development tooling
│   ├── eslint-config/                # Shared ESLint config
│   ├── tsconfig/                     # Shared TypeScript configs
│   └── test-utils/                   # Shared test utilities
├── docs/                             # KEEP: Documentation
├── specs/                            # KEEP: Development specs
├── scripts/                          # KEEP: Build & dev scripts
├── prisma/                           # KEEP: Database schema
├── .github/                          # NEW: GitHub workflows
└── config/                           # NEW: Root-level configs
    ├── .eslintrc.js                  # ESLint root config
    ├── .prettierrc.js                # Prettier root config
    └── vitest.config.base.ts         # MOVE: Base Vitest config
```

### Package: `packages/shared` (NEW)

**Purpose**: Zero-dependency shared types, constants, and pure utilities.

```
packages/shared/
├── src/
│   ├── types/
│   │   ├── index.ts                  # Main type exports
│   │   ├── agent.ts                  # Agent-related types
│   │   ├── devlog.ts                 # Devlog entry types
│   │   ├── project.ts                # Project/workspace types
│   │   ├── event.ts                  # Event types
│   │   └── api.ts                    # API request/response types
│   ├── constants/
│   │   ├── index.ts
│   │   ├── agent-types.ts
│   │   ├── devlog-status.ts
│   │   └── event-types.ts
│   ├── utils/
│   │   ├── string.ts                 # Pure string utilities
│   │   ├── date.ts                   # Pure date utilities
│   │   ├── validation.ts             # Pure validation functions
│   │   └── formatting.ts             # Pure formatting functions
│   └── index.ts                      # Main export
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

**Key principles**:
- Zero dependencies (except TypeScript & dev tools)
- All functions are pure (no side effects)
- Comprehensive tests for all utilities
- Strict type definitions

### Package: `packages/core` (REFACTOR)

**Purpose**: Business logic and data access layer (no auth, no UI).

```
packages/core/
├── src/
│   ├── services/
│   │   ├── base/                     # Base service classes
│   │   │   ├── prisma-service-base.ts
│   │   │   └── service-interface.ts
│   │   ├── devlog/                   # Devlog services
│   │   │   ├── devlog-service.ts
│   │   │   ├── document-service.ts
│   │   │   └── hierarchy-service.ts
│   │   ├── project/                  # Project services
│   │   │   ├── project-service.ts
│   │   │   └── workspace-service.ts
│   │   ├── agent/                    # Agent observability services
│   │   │   ├── session-service.ts
│   │   │   ├── event-service.ts
│   │   │   └── metrics-service.ts
│   │   └── index.ts
│   ├── repositories/                 # NEW: Data access layer
│   │   ├── devlog-repository.ts
│   │   ├── project-repository.ts
│   │   └── agent-repository.ts
│   ├── domain/                       # NEW: Domain models
│   │   ├── devlog.ts
│   │   ├── project.ts
│   │   └── agent-session.ts
│   ├── validation/                   # Business validation
│   │   ├── devlog-validation.ts
│   │   └── project-validation.ts
│   ├── utils/                        # Service-specific utilities
│   │   ├── date-utils.ts
│   │   └── query-utils.ts
│   └── index.ts
├── tests/                            # MOVE: All tests here
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── package.json
├── tsconfig.json
└── README.md
```

**Changes**:
- Remove auth logic → move to `@codervisor/devlog-auth`
- Extract types → move to `@codervisor/devlog-shared`
- Add repository pattern for data access
- Improve service organization

### Package: `packages/auth` (NEW)

**Purpose**: Authentication, authorization, and user management.

```
packages/auth/
├── src/
│   ├── services/
│   │   ├── auth-service.ts           # Core auth operations
│   │   ├── token-service.ts          # JWT management
│   │   ├── user-service.ts           # User operations
│   │   └── sso-service.ts            # SSO integrations
│   ├── providers/
│   │   ├── github.ts                 # GitHub OAuth
│   │   ├── google.ts                 # Google OAuth
│   │   └── wechat.ts                 # WeChat OAuth
│   ├── middleware/
│   │   ├── auth-middleware.ts        # Request authentication
│   │   └── rbac-middleware.ts        # Role-based access control
│   ├── validation/
│   │   ├── auth-schemas.ts           # Zod schemas
│   │   └── password-policy.ts        # Password validation
│   ├── utils/
│   │   ├── crypto.ts                 # Encryption utilities
│   │   └── token-utils.ts            # Token utilities
│   └── index.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── package.json
├── tsconfig.json
└── README.md
```

**Benefits**:
- Clear separation of concerns
- Reusable across packages
- Easier to test in isolation
- Security-focused organization

### Package: `packages/collector` (RENAME from collector-go)

**Purpose**: Go-based log collector for AI agent observability.

```
packages/collector/
├── cmd/
│   ├── collector/                    # Main collector binary
│   │   └── main.go
│   ├── test-parser/                  # Test utilities
│   │   └── main.go
│   └── workspace-mapper/             # Workspace mapping tool
│       └── main.go
├── internal/
│   ├── adapters/                     # Agent-specific parsers
│   │   ├── copilot.go
│   │   ├── claude.go
│   │   ├── cursor.go
│   │   └── generic.go
│   ├── buffer/                       # Offline storage
│   ├── config/                       # Configuration
│   ├── watcher/                      # File watching
│   ├── client/                       # HTTP client
│   └── backfill/                     # NEW: Historical collection
│       ├── backfill.go
│       ├── checkpoint.go
│       └── deduplication.go
├── pkg/
│   └── types/                        # Public Go types
├── tests/                            # Go tests
├── bin/                              # Compiled binaries
├── Makefile
├── go.mod
├── package.json                      # NEW: For monorepo integration
└── README.md
```

**Changes**:
- Add `package.json` for pnpm integration
- Implement backfill feature
- Better test organization
- CI/CD integration

### App: `apps/web` (REFACTOR)

**Purpose**: Next.js web interface with clear feature organization.

```
apps/web/
├── app/                              # Next.js app router
│   ├── (auth)/                       # Auth layout group
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/                  # Dashboard layout group
│   │   ├── dashboard/
│   │   ├── projects/
│   │   ├── sessions/
│   │   └── layout.tsx
│   ├── api/                          # API routes
│   │   ├── auth/
│   │   ├── projects/
│   │   ├── sessions/
│   │   ├── events/
│   │   └── health/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                           # Design system components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   └── index.ts
│   ├── features/                     # NEW: Feature-specific components
│   │   ├── devlog/
│   │   │   ├── devlog-list.tsx
│   │   │   ├── devlog-card.tsx
│   │   │   └── devlog-form.tsx
│   │   ├── projects/
│   │   │   ├── project-list.tsx
│   │   │   ├── project-card.tsx
│   │   │   └── project-form.tsx
│   │   ├── sessions/
│   │   │   ├── session-list.tsx
│   │   │   ├── session-timeline.tsx
│   │   │   └── session-details.tsx
│   │   └── agent-observability/
│   │       ├── event-viewer.tsx
│   │       └── metrics-dashboard.tsx
│   ├── layouts/                      # Layout components
│   │   ├── app-layout.tsx
│   │   ├── dashboard-layout.tsx
│   │   └── auth-layout.tsx
│   ├── providers/                    # Context providers
│   │   ├── app-providers.tsx
│   │   └── theme-provider.tsx
│   └── index.ts
├── lib/
│   ├── api/                          # API client functions
│   │   ├── client.ts                 # Base API client
│   │   ├── devlog-api.ts
│   │   ├── project-api.ts
│   │   └── session-api.ts
│   ├── hooks/                        # Custom React hooks
│   │   ├── use-devlog.ts
│   │   ├── use-project.ts
│   │   ├── use-realtime.ts
│   │   └── index.ts
│   ├── utils/                        # Frontend utilities
│   │   ├── formatting.ts
│   │   ├── validation.ts
│   │   └── api-utils.ts
│   ├── types/                        # Frontend-specific types
│   │   └── index.ts
│   └── index.ts
├── stores/                           # Zustand state management
│   ├── devlog-store.ts
│   ├── project-store.ts
│   └── auth-store.ts
├── styles/
│   ├── globals.css
│   └── fonts.css
├── tests/                            # EXPAND: Comprehensive testing
│   ├── unit/                         # Unit tests
│   │   ├── utils/
│   │   └── hooks/
│   ├── components/                   # Component tests
│   │   ├── ui/
│   │   └── features/
│   ├── integration/                  # Integration tests
│   │   └── api/
│   ├── e2e/                          # NEW: E2E tests (Playwright)
│   │   ├── auth.spec.ts
│   │   ├── devlog.spec.ts
│   │   └── projects.spec.ts
│   ├── fixtures/                     # Test data
│   │   ├── devlogs.ts
│   │   └── projects.ts
│   └── test-utils.ts                 # Test utilities
├── public/
├── middleware.ts
├── next.config.js
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── playwright.config.ts              # NEW: E2E test config
```

**Key improvements**:
- Route groups for better organization
- Feature-based component organization
- Clear separation: ui / features / layouts
- Comprehensive test structure
- E2E testing setup

### Tools: `tools/` (NEW)

**Purpose**: Shared development tooling across packages.

```
tools/
├── eslint-config/
│   ├── base.js                       # Base ESLint config
│   ├── react.js                      # React-specific rules
│   ├── node.js                       # Node.js rules
│   ├── package.json
│   └── README.md
├── tsconfig/
│   ├── base.json                     # Base TypeScript config
│   ├── react.json                    # React app config
│   ├── node.json                     # Node.js config
│   ├── package.json
│   └── README.md
└── test-utils/
    ├── src/
    │   ├── setup.ts                  # Test setup utilities
    │   ├── mocks.ts                  # Common mocks
    │   ├── factories.ts              # Test data factories
    │   └── index.ts
    ├── package.json
    ├── tsconfig.json
    └── README.md
```

**Benefits**:
- Consistent tooling across packages
- Easy to update and maintain
- Reusable test utilities
- Better DX (Developer Experience)

## Migration Strategy

### Phase 1: Foundation (Week 1)

**Goal**: Set up new packages and tooling infrastructure.

1. Create `packages/shared` package
   - Extract common types from core
   - Move pure utilities
   - Add comprehensive tests
   - Document API

2. Create `tools/` packages
   - Set up ESLint config package
   - Set up TypeScript config package
   - Set up test-utils package

3. Add ESLint to all packages
   - Install and configure
   - Fix critical issues
   - Add pre-commit hooks

4. Rename `collector-go` → `collector`
   - Add package.json for monorepo integration
   - Update build scripts
   - Update documentation

**Deliverables**:
- ✅ `@codervisor/devlog-shared` package published
- ✅ `@codervisor/eslint-config` package created
- ✅ ESLint running on all packages
- ✅ Collector integrated into monorepo

### Phase 2: Core Refactoring (Week 2)

**Goal**: Refactor core package and extract auth.

1. Create `packages/auth` package
   - Extract auth service from core
   - Move SSO providers
   - Add middleware
   - Comprehensive tests

2. Refactor `packages/core`
   - Remove auth code
   - Add repository pattern
   - Organize by domain
   - Update tests

3. Update dependencies
   - Web app uses new packages
   - MCP uses new packages
   - Update import paths

**Deliverables**:
- ✅ `@codervisor/devlog-auth` package published
- ✅ Core package refactored
- ✅ All packages updated
- ✅ Tests passing

### Phase 3: Web App Restructure (Week 3)

**Goal**: Reorganize web app for better maintainability.

1. Restructure components
   - Create `ui/` directory
   - Create `features/` directory
   - Create `layouts/` directory
   - Update imports

2. Organize lib/
   - Separate API clients
   - Organize hooks
   - Organize utils
   - Update exports

3. Set up testing infrastructure
   - Add test utilities
   - Add fixtures
   - Set up component testing
   - Add E2E testing

**Deliverables**:
- ✅ Component hierarchy reorganized
- ✅ Lib directory organized
- ✅ Testing infrastructure ready
- ✅ Documentation updated

### Phase 4: Testing & Quality (Week 4)

**Goal**: Achieve 50%+ test coverage and establish quality gates.

1. Write component tests
   - UI components
   - Feature components
   - Hooks

2. Write integration tests
   - API routes
   - Service integration
   - Database operations

3. Set up E2E tests
   - Auth flows
   - Critical user journeys
   - Happy paths

4. Quality gates
   - Pre-commit hooks
   - CI/CD checks
   - Code review guidelines

**Deliverables**:
- ✅ 50%+ test coverage
- ✅ E2E tests for critical flows
- ✅ CI/CD pipeline with quality gates
- ✅ Testing documentation

### Phase 5: Documentation & Polish (Week 5)

**Goal**: Complete documentation and optimize build pipeline.

1. API Documentation
   - OpenAPI/Swagger specs
   - API usage examples
   - Integration guides

2. Architecture Documentation
   - System design diagrams
   - Data flow diagrams
   - Decision records (ADRs)

3. Build Optimization
   - Turbo.json optimization
   - Webpack simplification
   - Bundle analysis
   - Performance monitoring

4. Developer Experience
   - Contributing guide
   - Development workflows
   - Troubleshooting guide

**Deliverables**:
- ✅ Complete API documentation
- ✅ Architecture documentation
- ✅ Optimized build pipeline
- ✅ Comprehensive guides

## Implementation Checklist

See [implementation.md](./implementation.md) for detailed task breakdown.

## Success Metrics

### Code Quality
- [ ] ESLint enabled on all packages (0 errors)
- [ ] Test coverage ≥ 50% for core packages
- [ ] Test coverage ≥ 70% for web app
- [ ] Zero console.log statements in production code
- [ ] All TODO comments tracked in issues

### Build & Performance
- [ ] Build time reduced by 20%
- [ ] Bundle size reduced by 15%
- [ ] Hot reload time < 2 seconds
- [ ] CI/CD pipeline < 10 minutes

### Developer Experience
- [ ] Clear onboarding guide (< 15 minutes setup)
- [ ] Component documentation for all UI components
- [ ] API documentation for all endpoints
- [ ] Contribution guide with examples

### Testing
- [ ] Unit tests for all pure functions
- [ ] Integration tests for all services
- [ ] Component tests for all UI components
- [ ] E2E tests for critical user flows
- [ ] CI/CD runs all tests on every PR

## Risks & Mitigation

### Risk 1: Breaking Changes

**Risk**: Refactoring may break existing functionality.

**Mitigation**:
- Comprehensive test suite before refactoring
- Feature flags for gradual rollout
- Keep old structure until new one is stable
- Automated testing in CI/CD

### Risk 2: Import Path Hell

**Risk**: Updating import paths across 200+ files prone to errors.

**Mitigation**:
- Use automated refactoring tools (TypeScript LSP)
- Create barrel exports (`index.ts`) for clean imports
- Document import patterns
- Use path aliases consistently

### Risk 3: Go Collector Integration

**Risk**: Go package doesn't fit TypeScript monorepo patterns.

**Mitigation**:
- Keep Go code independent
- Add package.json for minimal integration
- Use Makefile for Go-specific tasks
- Document hybrid monorepo setup

### Risk 4: Time Estimation

**Risk**: 5-week timeline may be optimistic.

**Mitigation**:
- Prioritize critical improvements (Phase 1-3)
- Make Phase 4-5 optional/parallel
- Regular progress checkpoints
- Scope flexibility

## Dependencies

- All packages must depend on `@codervisor/devlog-shared`
- Web app depends on `core` and `auth`
- MCP depends on `core` and `auth`
- AI package depends on `core`
- Collector is independent (Go)

## Related Documents

- [Current Analysis](../../AGENTS.md#project-structure-analysis)
- [Testing Guide](../../../docs/guides/TESTING.md) _(to be created)_
- [Architecture Decision Records](../../../docs/architecture/) _(to be created)_

## Notes

- This is a comprehensive restructuring that will take significant effort
- Focus on incremental improvements - don't need to do everything at once
- Prioritize high-impact changes: testing infrastructure, ESLint, core refactoring
- Keep backward compatibility where possible during migration
- Use feature flags for risky changes
