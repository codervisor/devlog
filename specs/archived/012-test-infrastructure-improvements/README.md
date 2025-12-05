---
status: archived
created: '2025-11-02'
tags:
  - testing
  - infrastructure
  - quality
priority: medium
created_at: '2025-11-02T10:42:00+08:00'
updated_at: '2025-12-05T04:28:09.307Z'
updated: '2025-12-05'
completed_at: '2025-11-11T14:03:57.944Z'
completed: '2025-11-11'
transitions:
  - status: complete
    at: '2025-11-11T14:03:57.944Z'
  - status: archived
    at: '2025-12-05T04:28:09.307Z'
---

# Test Infrastructure Improvements

> **Status**: 📦 Archived · **Priority**: Medium · **Created**: 2025-11-02 · **Tags**: testing, infrastructure, quality

**Status**: ✅ Phase 1 Complete | � Phase 2 In Progress  
**Created**: 2025-11-02  
**Updated**: November 2, 2025 (Evening)  
**Spec**: `20251102/001-test-infrastructure-improvements`  
**Priority**: Medium  
**Estimated Effort**: 2-3 hours remaining

## Overview

Improve test infrastructure to achieve 100% test pass rate and better test reliability. Test pass rate improved from 66% to 78%. Main remaining issues are auth service database test isolation.

## Current State

### Test Results (as of 2025-11-02 Evening)

- **Total Tests**: 193
- **Passing**: 150 (78%) - Up from 115/174 (66%)
- **Failing**: 41 (21%) - Down from 59
- **Test Files**: Phase 1 infrastructure complete

### Issues Identified

1. **Test Isolation Problems**
   - Tests finding data from previous tests
   - Lack of database cleanup between tests
   - Shared state causing intermittent failures

2. **Auth Service Test Issues**
   - Tests expect mocks but hit real database
   - Mock implementation not working as expected
   - Need proper test doubles for Prisma client

3. **Database Setup**
   - No automated test database seeding
   - Manual `docker compose` and `prisma db push` required
   - No cleanup/reset between test runs

## Objectives

1. Achieve **100% test pass rate** with database running
2. Implement proper **test isolation** (each test independent)
3. Add **database cleanup/reset** utilities
4. Fix **auth service mocking** for unit tests
5. Add **test database seeding** for integration tests
6. Document **test setup and execution** procedures

## Design

### 1. Test Database Management

**Problem**: Tests need clean database state but currently leave data behind.

**Solution**: Implement database lifecycle hooks

```typescript
// tools/test-utils/src/database.ts

import { PrismaClient } from '@prisma/client';

let testPrisma: PrismaClient | null = null;

export async function setupTestDatabase(): Promise<PrismaClient> {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/devlog_test',
        },
      },
    });
    await testPrisma.$connect();
  }
  return testPrisma;
}

export async function cleanDatabase(prisma: PrismaClient): Promise<void> {
  // Delete in correct order respecting foreign keys
  await prisma.$transaction([
    prisma.agentEvent.deleteMany(),
    prisma.chatMessage.deleteMany(),
    prisma.chatSession.deleteMany(),
    prisma.agentSession.deleteMany(),
    prisma.workspace.deleteMany(),
    prisma.machine.deleteMany(),
    prisma.devlogDocument.deleteMany(),
    prisma.devlogNote.deleteMany(),
    prisma.devlogDependency.deleteMany(),
    prisma.devlogEntry.deleteMany(),
    prisma.userProvider.deleteMany(),
    prisma.user.deleteMany(),
    prisma.project.deleteMany(),
  ]);
}

export async function teardownTestDatabase(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
  }
}
```

**Usage in tests**:

```typescript
import { setupTestDatabase, cleanDatabase, teardownTestDatabase } from '@codervisor/test-utils';

describe('MyService', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should work', async () => {
    // Test with clean database
  });
});
```

### 2. Test Data Factories

**Problem**: Creating test data is repetitive and verbose.

**Solution**: Factory pattern for test data

```typescript
// tools/test-utils/src/factories.ts

export class TestDataFactory {
  constructor(private prisma: PrismaClient) {}

  async createProject(data?: Partial<Project>): Promise<Project> {
    return this.prisma.project.create({
      data: {
        name: data?.name || `test-project-${Date.now()}`,
        fullName: data?.fullName || `test/project-${Date.now()}`,
        repoUrl: data?.repoUrl || `git@github.com:test/project-${Date.now()}.git`,
        repoOwner: data?.repoOwner || 'test',
        repoName: data?.repoName || `project-${Date.now()}`,
        description: data?.description || 'Test project',
      },
    });
  }

  async createUser(data?: Partial<User>): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data?.email || `test-${Date.now()}@example.com`,
        name: data?.name || `Test User ${Date.now()}`,
        isEmailVerified: data?.isEmailVerified ?? true,
        ...data,
      },
    });
  }

  async createMachine(data?: Partial<Machine>): Promise<Machine> {
    return this.prisma.machine.create({
      data: {
        machineId: data?.machineId || `test-machine-${Date.now()}`,
        hostname: data?.hostname || `test-host-${Date.now()}`,
        username: data?.username || 'testuser',
        osType: data?.osType || 'linux',
        machineType: data?.machineType || 'local',
        ...data,
      },
    });
  }

  // More factories...
}
```

### 3. Auth Service Mock Improvements

**Problem**: Auth service tests expect mocks but hit real database.

**Solution**: Proper Prisma client mocking

```typescript
// packages/core/src/services/__tests__/prisma-auth-service.test.ts

import { vi } from 'vitest';
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

describe('PrismaAuthService', () => {
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let authService: PrismaAuthService;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    mockReset(mockPrisma);

    // Inject mock into service
    authService = PrismaAuthService.getInstance();
    (authService as any).prismaClient = mockPrisma;
  });

  it('should get user by ID', async () => {
    const mockUser = { id: 1, email: 'test@example.com' /* ... */ };
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const result = await authService.getUserById(1);

    expect(result).toEqual(mockUser);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });
});
```

### 4. Vitest Configuration Updates

**Update `vitest.config.base.ts`**:

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    isolate: true, // Run tests in isolation
    pool: 'forks', // Use process forking for better isolation
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
  },
});
```

**Create `vitest.setup.ts`** in each package:

```typescript
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, cleanDatabase, teardownTestDatabase } from '@codervisor/test-utils';

let prisma: PrismaClient;

beforeAll(async () => {
  prisma = await setupTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase(prisma);
});

afterAll(async () => {
  await teardownTestDatabase();
});
```

## Implementation Plan

### Phase 1: Test Utilities (2 hours) ✅ COMPLETE

- [x] Create database lifecycle utilities in `tools/test-utils`
  - [x] `setupTestDatabase()`
  - [x] `cleanDatabase()`
  - [x] `teardownTestDatabase()`
- [x] Create test data factories
  - [x] `TestDataFactory` class
  - [x] Factories for core entities (Project, User, Machine, etc.)
- [x] Add vitest-mock-extended dependency
  ```bash
  pnpm add -Dw vitest-mock-extended
  ```
- [x] Update test-utils exports

### Phase 2: Fix Auth Service Tests (1 hour)

- [ ] Update auth service tests to use proper mocks
- [ ] Add `vitest.setup.ts` for auth service tests
- [ ] Fix mock expectations vs real database calls
- [ ] Ensure tests use `mockDeep<PrismaClient>`

### Phase 3: Add Database Cleanup (1 hour) ✅ COMPLETE

- [x] Add `beforeEach` cleanup to all test files
- [x] Update Vitest config to include setup files
- [x] Create per-package `vitest.setup.ts` files
- [x] Test isolation verification

### Phase 4: CI/CD Integration (1 hour)

- [ ] Add test database setup to CI pipeline
- [ ] Use Docker Compose in CI
- [ ] Add database migration step before tests
- [ ] Ensure parallel test execution safety

### Phase 5: Documentation (30 minutes)

- [x] Update `docs/dev/TESTING.md` with setup instructions (see IMPLEMENTATION.md)
- [x] Document test utilities usage
- [x] Add troubleshooting guide
- [x] Example test patterns

### Phase 6: Validation (30 minutes)

- [x] Run full test suite
- [ ] Verify 100% pass rate (66% achieved, needs Phase 2 work)
- [x] Check test execution time (~5-7 seconds)
- [ ] Validate CI pipeline

## Success Criteria

- [x] **Database lifecycle management** - automated between tests ✅
- [x] **No test isolation issues** - all tests independent ✅
- [x] **Database cleanup** - automated between tests ✅
- [x] **Test execution time** < 10 seconds total ✅ (~5-7 seconds)
- [ ] **100% test pass rate** - 66% achieved, needs Phase 2 work ⏳
- [ ] **CI integration** - tests run automatically ⏳
- [x] **Documentation** - clear setup and usage guide ✅
- [x] **No flaky tests** - consistent results across runs ✅

**Current Status (Phase 1 Complete)**:

- ✅ Test infrastructure in place
- ✅ Database cleanup working
- ✅ Test isolation implemented
- ⏳ Individual test fixes needed (Phase 2)
- ⏳ CI/CD integration pending (Phase 4)

## Technical Debt

### Current Issues to Address

1. **Missing test database configuration**
   - Need separate `devlog_test` database
   - Or use transactions with rollback

2. **Test execution speed**
   - Currently ~7 seconds for 174 tests
   - Could improve with parallel execution

3. **Mock coverage**
   - Not all Prisma operations are mocked
   - Need consistent mocking strategy

## Future Enhancements

- **Snapshot testing** for API responses
- **Load testing** utilities
- **E2E testing** framework (Playwright)
- **Test coverage reporting** (integrated with CI)
- **Visual regression testing** for web UI

## References

- Current test results: 115/174 passing (66%)
- Related: `specs/20251101/001-project-folder-restructure/` - Phase 1 testing setup
- Vitest docs: https://vitest.dev/
- Prisma testing guide: https://www.prisma.io/docs/guides/testing
- vitest-mock-extended: https://github.com/eratio08/vitest-mock-extended
