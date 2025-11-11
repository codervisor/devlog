# Implementation Checklist

**Spec**: Project Folder Restructure & Organization  
**Status**: 🚧 In Progress (~40% Complete)  
**Last Updated**: 2025-11-11

## Progress Summary

- ✅ Phase 1: ~50% complete (shared package, collector integration done; ESLint pending)
- ⏸️ Phase 2: Deferred (auth extraction not blocking MVP)
- ✅ Phase 3: ~70% complete (web components organized by domain)
- ✅ Phase 4: ~40% complete (test infrastructure done; remaining tests need fixes)
- ⏸️ Phase 5: Not started (documentation can be done incrementally)

## Phase 1: Foundation (Week 1)

### 1.1 Create `packages/shared` Package ✅ **COMPLETE**

- [x] Initialize package structure
  ```bash
  mkdir -p packages/shared/src/{types,constants,utils}
  pnpm init -w packages/shared
  ```
- [x] Set up package.json with zero dependencies
- [x] Set up TypeScript configuration (strict mode)
- [x] Set up Vitest configuration
- [x] Extract types from core package:
  - [x] Agent types (`agent.ts`)
  - [x] Devlog types (`devlog.ts`)
  - [x] Project types (`project.ts`)
  - [x] Event types (`event.ts`)
  - [x] API types (`api.ts`)
- [x] Extract constants:
  - [x] Agent types constants
  - [x] Devlog status constants
  - [x] Event types constants
- [x] Extract pure utilities:
  - [x] String utilities
  - [x] Date utilities
  - [x] Validation utilities
  - [x] Formatting utilities
- [x] Write comprehensive tests (target: 100% coverage)
- [x] Create API documentation
- [x] Update barrel exports (`index.ts`)

### 1.2 Create `tools/eslint-config` Package

- [ ] Initialize package structure
  ```bash
  mkdir -p tools/eslint-config
  pnpm init -w tools/eslint-config
  ```
- [ ] Create base ESLint configuration
  - [ ] Install dependencies (@typescript-eslint, etc.)
  - [ ] Configure rules for TypeScript
  - [ ] Configure rules for imports
  - [ ] Configure rules for code quality
- [ ] Create React-specific configuration
  - [ ] React hooks rules
  - [ ] JSX rules
  - [ ] Accessibility rules
- [ ] Create Node.js-specific configuration
  - [ ] Node-specific rules
  - [ ] Module resolution rules
- [ ] Document usage and customization
- [ ] Test configurations on sample code

### 1.3 Create `tools/tsconfig` Package

- [ ] Initialize package structure
  ```bash
  mkdir -p tools/tsconfig
  ```
- [ ] Create base TypeScript configuration
  - [ ] Strict mode settings
  - [ ] Module resolution
  - [ ] Path aliases
  - [ ] Source maps
- [ ] Create React app configuration (extends base)
  - [ ] JSX settings
  - [ ] DOM types
  - [ ] React-specific options
- [ ] Create Node.js configuration (extends base)
  - [ ] Node types
  - [ ] Module settings
- [ ] Document usage patterns
- [ ] Test with existing packages

### 1.4 Create `tools/test-utils` Package ✅ **COMPLETE**

- [x] Initialize package structure
  ```bash
  mkdir -p tools/test-utils/src
  pnpm init -w tools/test-utils
  ```
- [x] Create test setup utilities
  - [x] Vitest global setup
  - [x] React Testing Library setup
  - [x] Mock utilities
- [x] Create test factories
  - [x] Devlog factory
  - [x] Project factory
  - [x] Agent session factory
  - [x] Event factory
- [x] Create common mocks
  - [x] API client mocks
  - [x] Database mocks
  - [x] External service mocks
- [x] Document testing patterns
- [x] Create example tests

### 1.5 Add ESLint to All Packages

- [ ] Update root package.json
  ```bash
  pnpm add -Dw eslint @codervisor/eslint-config
  ```
- [ ] Add ESLint configs to each package:
  - [ ] `packages/core/.eslintrc.js`
  - [ ] `packages/ai/.eslintrc.js`
  - [ ] `packages/mcp/.eslintrc.js`
  - [ ] `apps/web/.eslintrc.js`
- [ ] Add lint scripts to package.json files
- [ ] Run ESLint and create issue list for fixes
- [ ] Fix critical issues (errors)
- [ ] Add ESLint to pre-commit hooks
  ```bash
  pnpm add -Dw husky lint-staged
  ```
- [ ] Update `.husky/pre-commit`
- [ ] Update `package.json` lint-staged config
- [ ] Test pre-commit hooks

### 1.6 Rename `collector-go` → `collector` ✅ **COMPLETE**

- [x] Rename directory
  ```bash
  git mv packages/collector-go packages/collector
  ```
- [x] Create package.json for monorepo integration
  ```json
  {
    "name": "@codervisor/devlog-collector",
    "version": "0.1.0",
    "scripts": {
      "build": "make build",
      "test": "make test",
      "dev": "make dev",
      "clean": "make clean"
    }
  }
  ```
- [x] Update pnpm-workspace.yaml if needed
- [x] Update documentation references
- [x] Update docker-compose.yml references
- [x] Update CI/CD scripts
- [x] Test build process
- [x] Update README.md

### 1.7 Remove console.log Statements

- [ ] Find all console.log instances
  ```bash
  grep -r "console\\.log" apps/web --include="*.ts" --include="*.tsx"
  ```
- [ ] Replace with proper logging:
  - [ ] Create logging utility in `packages/shared`
  - [ ] Replace console.log with structured logging
  - [ ] Add log levels (debug, info, warn, error)
- [ ] Update ESLint to prevent future console.log
- [ ] Test logging in development and production

## Phase 2: Core Refactoring (Week 2) ⏸️ **DEFERRED**

> **Note**: Auth package extraction is not blocking MVP launch. This work can be done post-launch to improve code organization but doesn't affect functionality.

### 2.1 Create `packages/auth` Package

- [ ] Initialize package structure
  ```bash
  mkdir -p packages/auth/src/{services,providers,middleware,validation,utils}
  pnpm init -w packages/auth
  ```
- [ ] Set up package.json with dependencies
- [ ] Set up TypeScript configuration
- [ ] Set up Vitest configuration
- [ ] Extract from core package:
  - [ ] `auth.ts` → `services/auth-service.ts`
  - [ ] JWT logic → `services/token-service.ts`
  - [ ] User operations → `services/user-service.ts`
- [ ] Create SSO providers:
  - [ ] GitHub OAuth (`providers/github.ts`)
  - [ ] Google OAuth (`providers/google.ts`)
  - [ ] WeChat OAuth (`providers/wechat.ts`)
- [ ] Create middleware:
  - [ ] `middleware/auth-middleware.ts`
  - [ ] `middleware/rbac-middleware.ts`
- [ ] Create validation schemas:
  - [ ] Login/register schemas
  - [ ] Password policy
  - [ ] Token validation
- [ ] Write unit tests (target: 80% coverage)
- [ ] Write integration tests
- [ ] Create API documentation
- [ ] Update exports

### 2.2 Refactor `packages/core`

- [ ] Remove auth code
  - [ ] Delete `src/auth.ts`
  - [ ] Delete auth-related services
  - [ ] Update imports
- [ ] Add repository pattern:
  - [ ] Create `repositories/` directory
  - [ ] `devlog-repository.ts`
  - [ ] `project-repository.ts`
  - [ ] `agent-repository.ts`
- [ ] Organize services by domain:
  - [ ] `services/devlog/`
  - [ ] `services/project/`
  - [ ] `services/agent/`
- [ ] Add domain models:
  - [ ] Create `domain/` directory
  - [ ] Define domain entities
  - [ ] Add business logic
- [ ] Update service dependencies:
  - [ ] Use `@codervisor/devlog-shared`
  - [ ] Use `@codervisor/devlog-auth` where needed
- [ ] Move tests to `tests/` directory:
  - [ ] `tests/unit/`
  - [ ] `tests/integration/`
  - [ ] `tests/fixtures/`
- [ ] Update all tests
- [ ] Run test suite
- [ ] Update documentation

### 2.3 Update Package Dependencies

- [ ] Update `packages/ai`:
  - [ ] Add `@codervisor/devlog-shared` dependency
  - [ ] Update imports from core
  - [ ] Run tests
- [ ] Update `packages/mcp`:
  - [ ] Add `@codervisor/devlog-shared` dependency
  - [ ] Add `@codervisor/devlog-auth` dependency
  - [ ] Update imports
  - [ ] Run tests
- [ ] Update `apps/web`:
  - [ ] Add `@codervisor/devlog-shared` dependency
  - [ ] Add `@codervisor/devlog-auth` dependency
  - [ ] Update imports throughout app
  - [ ] Update tsconfig.json paths
  - [ ] Run build
  - [ ] Run tests
- [ ] Test all packages together:
  - [ ] `pnpm build`
  - [ ] `pnpm test`
  - [ ] `pnpm dev:web`
- [ ] Update documentation

## Phase 3: Web App Restructure (Week 3)

### 3.1 Restructure Components Directory ✅ **MOSTLY COMPLETE**

- [x] Create new directory structure
  ```bash
  mkdir -p apps/web/components/{ui,features,layouts,providers}
  ```
- [x] Move UI components:
  - [x] Identify primitive components (button, input, dialog, etc.)
  - [x] Move to `components/ui/`
  - [x] Update imports in consuming components
  - [x] Create barrel export (`ui/index.ts`)
- [x] Organize feature components:
  - [x] Create `agent-observability/` (agent-specific components)
  - [x] Create `project-management/` (project-specific components)
  - [x] Create `auth/` (auth-specific components)
  - [x] Create `forms/` (form components)
  - [x] Create `realtime/` (real-time components)
  - [x] Move components to appropriate features
  - [x] Update imports
  - [x] Create barrel exports
- [x] Move layout components:
  - [x] Move to `components/layout/`
  - [x] Update imports
  - [x] Create barrel export
- [x] Move provider components:
  - [x] Keep in `components/provider/`
  - [x] Verify imports
  - [x] Create barrel export
- [x] Update main barrel export (`components/index.ts`)
- [x] Fix all import errors
- [x] Run type checking: `pnpm tsc --noEmit`
- [x] Test application

### 3.2 Organize lib/ Directory

- [ ] Create subdirectories
  ```bash
  mkdir -p apps/web/lib/{api,hooks,utils,types}
  ```
- [ ] Organize API clients:
  - [ ] Create `api/client.ts` (base API client)
  - [ ] Create `api/devlog-api.ts`
  - [ ] Create `api/project-api.ts`
  - [ ] Create `api/session-api.ts`
  - [ ] Create `api/event-api.ts`
  - [ ] Move and refactor existing API code
  - [ ] Create barrel export (`api/index.ts`)
- [ ] Organize hooks:
  - [ ] Move to `hooks/`
  - [ ] Ensure consistent naming (`use-*.ts`)
  - [ ] Add JSDoc comments
  - [ ] Create barrel export (`hooks/index.ts`)
- [ ] Organize utilities:
  - [ ] Move pure functions to `utils/`
  - [ ] Group by purpose (formatting, validation, etc.)
  - [ ] Create barrel export (`utils/index.ts`)
- [ ] Organize types:
  - [ ] Create `types/` directory
  - [ ] Frontend-specific types only
  - [ ] Extend types from `@codervisor/devlog-shared`
  - [ ] Create barrel export
- [ ] Update main lib export (`lib/index.ts`)
- [ ] Fix all import errors
- [ ] Run type checking
- [ ] Test application

### 3.3 Organize App Routes with Route Groups

- [ ] Create route groups
  ```bash
  mkdir -p apps/web/app/{(auth),(dashboard)}
  ```
- [ ] Move auth routes:
  - [ ] Move `login/` → `(auth)/login/`
  - [ ] Move `register/` → `(auth)/register/`
  - [ ] Create `(auth)/layout.tsx`
- [ ] Move dashboard routes:
  - [ ] Move `dashboard/` → `(dashboard)/dashboard/`
  - [ ] Move `projects/` → `(dashboard)/projects/`
  - [ ] Move `sessions/` → `(dashboard)/sessions/`
  - [ ] Create `(dashboard)/layout.tsx`
- [ ] Update route imports
- [ ] Update middleware.ts if needed
- [ ] Test navigation
- [ ] Test layouts

### 3.4 Set Up Testing Infrastructure ✅ **COMPLETE**

- [x] Install testing dependencies
  ```bash
  pnpm add -D @testing-library/react @testing-library/jest-dom \
    @testing-library/user-event @vitejs/plugin-react \
    happy-dom
  ```
- [x] Update vitest.config.ts for React testing
- [x] Create test directory structure:
  ```bash
  mkdir -p apps/web/tests/{unit,components,integration,e2e,fixtures}
  ```
- [x] Create test utilities:
  - [x] `tests/test-utils.tsx` (custom render, providers)
  - [x] `tests/setup.ts` (global test setup)
- [x] Create test fixtures:
  - [x] Mock devlog data
  - [x] Mock project data
  - [x] Mock session data
  - [x] Mock API responses
- [ ] Set up E2E testing: ⏸️ **Deferred to MVP launch plan**
  ```bash
  pnpm add -D @playwright/test
  pnpm playwright install
  ```
- [ ] Create `playwright.config.ts` ⏸️ **Deferred**
- [x] Create example tests:
  - [x] Unit test example
  - [x] Component test example
  - [x] Integration test example
- [x] Add test scripts to package.json
- [x] Document testing patterns
- [x] Run example tests

## Phase 4: Testing & Quality (Week 4) 🚧 **PARTIAL**

> **Status**: Test infrastructure complete (11 test files, 193 tests, 78% pass rate). Remaining 41 failing tests need individual fixes. E2E testing deferred to MVP launch plan.

### 4.1 Write Component Tests 🚧 **IN PROGRESS**

- [ ] Test UI components (target: 80% coverage):
  - [ ] Button component
  - [ ] Input component
  - [ ] Dialog component
  - [ ] Form components
  - [ ] Navigation components
- [ ] Test feature components (target: 70% coverage):
  - [ ] Devlog list
  - [ ] Devlog card
  - [ ] Devlog form
  - [ ] Project list
  - [ ] Project card
  - [ ] Session timeline
  - [ ] Event viewer
  - [ ] Metrics dashboard
- [ ] Test layout components:
  - [ ] App layout
  - [ ] Dashboard layout
  - [ ] Auth layout
- [ ] Run coverage report
  ```bash
  pnpm test:coverage
  ```

### 4.2 Write Hook Tests

- [ ] Test custom hooks (target: 90% coverage):
  - [ ] `use-devlog.ts`
  - [ ] `use-project.ts`
  - [ ] `use-realtime-events.ts`
  - [ ] `use-session.ts`
  - [ ] Form hooks
  - [ ] API hooks
- [ ] Test hook edge cases
- [ ] Test hook error handling
- [ ] Run coverage report

### 4.3 Write Integration Tests

- [ ] Test API routes (target: 80% coverage):
  - [ ] Auth endpoints
  - [ ] Devlog endpoints
  - [ ] Project endpoints
  - [ ] Session endpoints
  - [ ] Event endpoints
- [ ] Test API integration:
  - [ ] Client → API → Database
  - [ ] Error handling
  - [ ] Authentication flow
  - [ ] Authorization checks
- [ ] Test service integration:
  - [ ] DevlogService
  - [ ] ProjectService
  - [ ] AgentService
- [ ] Run integration tests
  ```bash
  pnpm test:integration
  ```

### 4.4 Write E2E Tests ⏸️ **DEFERRED TO MVP LAUNCH**

> **Note**: E2E testing is covered by spec 008 (MVP Launch Plan). Will be implemented as part of pre-launch validation.

- [ ] Test authentication flows:
  - [ ] Login
  - [ ] Register
  - [ ] Logout
  - [ ] Password reset
  - [ ] SSO (GitHub, Google)
- [ ] Test critical user journeys:
  - [ ] Create devlog entry
  - [ ] Update devlog entry
  - [ ] Close devlog entry
  - [ ] View project
  - [ ] View session timeline
  - [ ] Filter and search
- [ ] Test error scenarios:
  - [ ] Network errors
  - [ ] Validation errors
  - [ ] Authorization errors
- [ ] Run E2E tests
  ```bash
  pnpm test:e2e
  ```

### 4.5 Set Up Quality Gates

- [ ] Update pre-commit hooks:
  - [ ] Lint staged files
  - [ ] Type check
  - [ ] Run affected tests
  - [ ] Format code
- [ ] Create GitHub Actions workflow:
  - [ ] Install dependencies
  - [ ] Build all packages
  - [ ] Run linter
  - [ ] Run type check
  - [ ] Run all tests
  - [ ] Generate coverage report
  - [ ] Check coverage thresholds
- [ ] Add status badges to README
- [ ] Document CI/CD pipeline
- [ ] Test workflow on PR

### 4.6 Code Review Guidelines

- [ ] Create PULL_REQUEST_TEMPLATE.md
- [ ] Create code review checklist:
  - [ ] Code follows style guide
  - [ ] Tests are included
  - [ ] Documentation is updated
  - [ ] Breaking changes are documented
  - [ ] Performance implications considered
- [ ] Document review process
- [ ] Train team on guidelines

## Phase 5: Documentation & Polish (Week 5)

### 5.1 API Documentation

- [ ] Install OpenAPI tools
  ```bash
  pnpm add -D swagger-jsdoc swagger-ui-express
  ```
- [ ] Add OpenAPI annotations to API routes:
  - [ ] Auth endpoints
  - [ ] Devlog endpoints
  - [ ] Project endpoints
  - [ ] Session endpoints
  - [ ] Event endpoints
- [ ] Generate OpenAPI spec
- [ ] Create API documentation page
- [ ] Add API usage examples
- [ ] Create Postman collection
- [ ] Document authentication
- [ ] Document rate limiting
- [ ] Document error responses

### 5.2 Architecture Documentation

- [ ] Create architecture overview
  - [ ] System context diagram
  - [ ] Container diagram
  - [ ] Component diagram
- [ ] Document data flow:
  - [ ] Request/response flow
  - [ ] Event flow
  - [ ] Real-time updates
- [ ] Create sequence diagrams:
  - [ ] Authentication
  - [ ] Devlog creation
  - [ ] Agent session tracking
- [ ] Document design patterns:
  - [ ] Repository pattern
  - [ ] Service layer pattern
  - [ ] API client pattern
- [ ] Create ADRs (Architecture Decision Records):
  - [ ] Package organization
  - [ ] Testing strategy
  - [ ] State management
  - [ ] Authentication approach
- [ ] Document database schema
- [ ] Document API design principles

### 5.3 Build Optimization

- [ ] Analyze current build:
  ```bash
  pnpm add -D @next/bundle-analyzer
  ```
- [ ] Configure bundle analyzer in next.config.js
- [ ] Generate bundle analysis report
- [ ] Identify optimization opportunities:
  - [ ] Large dependencies
  - [ ] Duplicate code
  - [ ] Unused exports
  - [ ] Code splitting opportunities
- [ ] Optimize Turbo.json:
  - [ ] Configure task dependencies
  - [ ] Configure outputs
  - [ ] Configure cache settings
  - [ ] Add more granular tasks
- [ ] Simplify webpack config:
  - [ ] Remove unnecessary fallbacks
  - [ ] Optimize externals
  - [ ] Review ignore warnings
- [ ] Add performance monitoring:
  - [ ] Build time tracking
  - [ ] Bundle size tracking
  - [ ] Lighthouse CI
- [ ] Set performance budgets
- [ ] Document build optimization guide

### 5.4 Developer Experience

- [ ] Create comprehensive CONTRIBUTING.md:
  - [ ] Getting started
  - [ ] Development workflow
  - [ ] Testing guidelines
  - [ ] Code style guide
  - [ ] Commit conventions
  - [ ] PR process
- [ ] Create development guide:
  - [ ] Project structure
  - [ ] Package overview
  - [ ] Common tasks
  - [ ] Debugging tips
  - [ ] Troubleshooting
- [ ] Create onboarding checklist:
  - [ ] Environment setup
  - [ ] First build
  - [ ] First PR
  - [ ] Learning resources
- [ ] Add VS Code workspace settings:
  - [ ] Recommended extensions
  - [ ] Editor settings
  - [ ] Debugging config
- [ ] Create video tutorials (optional):
  - [ ] Project overview
  - [ ] Development setup
  - [ ] Creating a feature
- [ ] Document common issues and solutions

### 5.5 Final Testing & Validation

- [ ] Run full test suite
  ```bash
  pnpm test
  pnpm test:integration
  pnpm test:e2e
  ```
- [ ] Check test coverage:
  - [ ] Core package ≥ 50%
  - [ ] Auth package ≥ 80%
  - [ ] Web app ≥ 70%
- [ ] Validate builds:
  ```bash
  pnpm build
  ```
- [ ] Test in Docker:
  ```bash
  docker compose up web
  ```
- [ ] Load testing (optional):
  - [ ] API endpoints
  - [ ] Database queries
  - [ ] Real-time updates
- [ ] Security audit:
  ```bash
  pnpm audit
  ```
- [ ] Accessibility audit:
  - [ ] Run Lighthouse
  - [ ] Test with screen reader
  - [ ] Check keyboard navigation
- [ ] Cross-browser testing:
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Safari
  - [ ] Edge
- [ ] Create release checklist
- [ ] Tag release

## Progress Tracking

Use the spec system to track progress:

```bash
# Update status as you progress
# Edit specs/20251101/001-project-folder-restructure/README.md

# Phase 1 started
Status: 🚧 In Progress

# Phase 1 completed
Status: ✅ Complete (Phase 1)

# All phases completed
Status: ✅ Complete
```

## Notes

- Each checkbox represents a discrete task
- Mark checkboxes as you complete tasks
- Update status in README.md at phase milestones
- Create issues for any blockers
- Document decisions in ADRs
- Keep stakeholders updated on progress
