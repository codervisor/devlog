# Test Refactoring Guide - Mock to Real Database

**Created**: November 2, 2025  
**Status**: Reference Guide  
**Purpose**: Template for refactoring mock-based tests to use real database with TestDataFactory

---

## Overview

This guide provides a step-by-step approach for refactoring mock-based tests to use real database with TestDataFactory. This is the primary pattern for achieving 95%+ test coverage for the MVP launch.

## Why Refactor?

**Current Issues with Mock-Based Tests**:

- Tests pass but don't catch real database issues
- Mocks get out of sync with actual Prisma schema
- Mock data uses wrong field names (snake_case vs camelCase)
- Foreign key constraints not validated
- Complex mock setup that's hard to maintain

**Benefits of Real Database Tests**:

- Tests actual behavior, not mocks
- Catches real issues (FK violations, type mismatches, etc.)
- Cleaner, more maintainable test code
- Automatic database cleanup between tests
- Type-safe test data with TestDataFactory

---

## Prerequisites

Before refactoring tests, ensure:

1. ✅ PostgreSQL database is running (`docker compose up postgres`)
2. ✅ Database schema is applied (`pnpm prisma db push`)
3. ✅ TestDataFactory is available in `@codervisor/test-utils`
4. ✅ Test setup file exists with database cleanup hooks

---

## Refactoring Pattern

### Step 1: Remove Mock Setup

**Before** (mock-based):

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ❌ Remove these mock imports
vi.mock('../../utils/prisma-config.js', () => ({
  getPrismaClient: vi.fn(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      // ... more mocks
    },
  })),
}));

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = MyService.getInstance();
    vi.clearAllMocks();
  });
```

**After** (real database):

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDatabase, TestDataFactory } from '@codervisor/test-utils';
import type { PrismaClient } from '@prisma/client';

describe('MyService', () => {
  let service: MyService;
  let prisma: PrismaClient;
  let factory: TestDataFactory;

  beforeEach(async () => {
    prisma = await setupTestDatabase();
    factory = new TestDataFactory(prisma);
    service = MyService.getInstance();
    await service.initialize();
  });
```

### Step 2: Create Test Data with TestDataFactory

**Before** (mock data):

```typescript
it('should get user by ID', async () => {
  const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };

  // ❌ Mock Prisma response
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

  const result = await service.getUserById(1);
  expect(result).toEqual(mockUser);
});
```

**After** (real data):

```typescript
it('should get user by ID', async () => {
  // ✅ Create real test data
  const user = await factory.createUser({
    email: 'test@example.com',
    name: 'Test User',
  });

  const result = await service.getUserById(user.id);

  expect(result).toBeDefined();
  expect(result?.id).toBe(user.id);
  expect(result?.email).toBe('test@example.com');
  expect(result?.name).toBe('Test User');
});
```

### Step 3: Handle Foreign Key Relationships

**Before** (ignoring FKs):

```typescript
it('should create workspace', async () => {
  const mockWorkspace = {
    id: 1,
    projectId: 1, // ❌ Project doesn't exist!
    machineId: 1, // ❌ Machine doesn't exist!
    workspaceId: 'test-workspace',
  };

  vi.mocked(prisma.workspace.create).mockResolvedValue(mockWorkspace);
  // ...
});
```

**After** (proper FK setup):

```typescript
it('should create workspace', async () => {
  // ✅ Create required parent records first
  const project = await factory.createProject({ name: 'test-project' });
  const machine = await factory.createMachine({ machineId: 'test-machine' });

  // ✅ Then create child record with proper FKs
  const workspace = await factory.createWorkspace({
    projectId: project.id,
    machineId: machine.id,
    workspaceId: 'test-workspace',
  });

  expect(workspace.projectId).toBe(project.id);
  expect(workspace.machineId).toBe(machine.id);
});
```

### Step 4: Use Correct Field Names (camelCase)

**Before** (snake_case - WRONG):

```typescript
const mockData = {
  id: 'session-1',
  agent_id: 'github-copilot', // ❌ Wrong!
  project_id: 1, // ❌ Wrong!
  start_time: new Date(), // ❌ Wrong!
};
```

**After** (camelCase - CORRECT):

```typescript
const session = await factory.createAgentSession({
  agentId: 'github-copilot', // ✅ Correct!
  projectId: project.id, // ✅ Correct!
  startTime: new Date(), // ✅ Correct!
});
```

### Step 5: Test Error Cases Properly

**Before** (mocked errors):

```typescript
it('should handle not found', async () => {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

  const result = await service.getUserById(999);
  expect(result).toBeNull();
});
```

**After** (real not found):

```typescript
it('should handle not found', async () => {
  // ✅ Just query with non-existent ID
  const result = await service.getUserById(999999);
  expect(result).toBeNull();
});
```

---

## Complete Example: Before & After

### Before (Mock-Based)

```typescript
// ❌ OLD APPROACH
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaDevlogService } from '../prisma-devlog-service.js';

vi.mock('../../utils/prisma-config.js', () => ({
  getPrismaClient: vi.fn(() => ({
    $connect: vi.fn(),
    devlogEntry: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  })),
}));

describe('PrismaDevlogService', () => {
  let service: PrismaDevlogService;

  beforeEach(() => {
    service = PrismaDevlogService.getInstance(1);
    vi.clearAllMocks();
  });

  it('should create devlog entry', async () => {
    const mockEntry = {
      id: 1,
      key: 'TEST-1',
      title: 'Test Entry',
      type: 'task',
      status: 'new',
      projectId: 1,
    };

    vi.mocked(prisma.devlogEntry.create).mockResolvedValue(mockEntry);

    const result = await service.create({
      title: 'Test Entry',
      type: 'task',
    });

    expect(result).toEqual(mockEntry);
  });

  it('should list devlog entries', async () => {
    const mockEntries = [
      { id: 1, title: 'Entry 1' /* ... */ },
      { id: 2, title: 'Entry 2' /* ... */ },
    ];

    vi.mocked(prisma.devlogEntry.findMany).mockResolvedValue(mockEntries);

    const result = await service.list({ projectId: 1 });
    expect(result.entries).toEqual(mockEntries);
  });
});
```

### After (Real Database)

```typescript
// ✅ NEW APPROACH
import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDatabase, TestDataFactory } from '@codervisor/test-utils';
import { PrismaDevlogService } from '../prisma-devlog-service.js';
import type { PrismaClient } from '@prisma/client';

describe('PrismaDevlogService', () => {
  let service: PrismaDevlogService;
  let prisma: PrismaClient;
  let factory: TestDataFactory;
  let project: any;

  beforeEach(async () => {
    prisma = await setupTestDatabase();
    factory = new TestDataFactory(prisma);

    // Create project first (required FK)
    project = await factory.createProject({ name: 'test-project' });

    service = PrismaDevlogService.getInstance(project.id);
    await service.initialize();
  });

  it('should create devlog entry', async () => {
    const result = await service.create({
      title: 'Test Entry',
      type: 'task',
      status: 'new',
      priority: 'medium',
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    expect(result.title).toBe('Test Entry');
    expect(result.type).toBe('task');
    expect(result.projectId).toBe(project.id);
  });

  it('should list devlog entries', async () => {
    // Create test data
    const entry1 = await factory.createDevlogEntry({
      projectId: project.id,
      title: 'Entry 1',
    });
    const entry2 = await factory.createDevlogEntry({
      projectId: project.id,
      title: 'Entry 2',
    });

    const result = await service.list({ projectId: project.id });

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].title).toBe('Entry 1');
    expect(result.entries[1].title).toBe('Entry 2');
  });

  it('should handle empty list', async () => {
    const result = await service.list({ projectId: project.id });

    expect(result.entries).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });
});
```

---

## TestDataFactory API Reference

### Core Methods

```typescript
// Projects
await factory.createProject({
  name?: string,
  fullName?: string,
  repoUrl?: string,
  description?: string,
});

// Users
await factory.createUser({
  email?: string,
  name?: string,
  passwordHash?: string,
  isEmailVerified?: boolean,
});

// Machines
await factory.createMachine({
  machineId?: string,
  hostname?: string,
  username?: string,
  osType?: string,
});

// Workspaces (requires project + machine)
await factory.createWorkspace({
  projectId: number,      // Required
  machineId: number,      // Required
  workspaceId?: string,
  workspacePath?: string,
  branch?: string,
});

// Devlog Entries (requires project)
await factory.createDevlogEntry({
  projectId: number,      // Required
  key?: string,
  title?: string,
  type?: string,
  status?: string,
});

// Chat Sessions (requires workspace)
await factory.createChatSession({
  workspaceId: number,    // Required
  sessionId?: string,
  agentType?: string,
});

// Agent Sessions (requires project)
await factory.createAgentSession({
  projectId: number,      // Required
  agentId?: string,
  startTime?: Date,
});

// Convenience: Create full hierarchy
const { project, machine, workspace } = await factory.createCompleteSetup({
  projectName?: string,
  machineName?: string,
});
```

---

## Common Patterns

### Pattern 1: Testing CRUD Operations

```typescript
describe('CRUD operations', () => {
  it('should create, read, update, delete', async () => {
    // Create
    const created = await service.create({ title: 'Test' });
    expect(created.id).toBeDefined();

    // Read
    const found = await service.get(created.id);
    expect(found).toBeDefined();
    expect(found?.title).toBe('Test');

    // Update
    const updated = await service.update(created.id, { title: 'Updated' });
    expect(updated.title).toBe('Updated');

    // Delete
    await service.delete(created.id);
    const deleted = await service.get(created.id);
    expect(deleted).toBeNull();
  });
});
```

### Pattern 2: Testing with Multiple Related Records

```typescript
it('should handle related records', async () => {
  const project = await factory.createProject();
  const machine = await factory.createMachine();

  // Create multiple workspaces for same project
  const ws1 = await factory.createWorkspace({
    projectId: project.id,
    machineId: machine.id,
    workspaceId: 'workspace-1',
  });

  const ws2 = await factory.createWorkspace({
    projectId: project.id,
    machineId: machine.id,
    workspaceId: 'workspace-2',
  });

  const workspaces = await service.getProjectWorkspaces(project.id);
  expect(workspaces).toHaveLength(2);
});
```

### Pattern 3: Testing Filtering and Pagination

```typescript
it('should filter and paginate', async () => {
  const project = await factory.createProject();

  // Create test data
  for (let i = 0; i < 25; i++) {
    await factory.createDevlogEntry({
      projectId: project.id,
      title: `Entry ${i}`,
      status: i % 2 === 0 ? 'new' : 'completed',
    });
  }

  // Test filtering
  const newEntries = await service.list({
    projectId: project.id,
    status: 'new',
  });
  expect(newEntries.entries.length).toBeLessThanOrEqual(13);

  // Test pagination
  const page1 = await service.list({
    projectId: project.id,
    limit: 10,
    offset: 0,
  });
  expect(page1.entries).toHaveLength(10);

  const page2 = await service.list({
    projectId: project.id,
    limit: 10,
    offset: 10,
  });
  expect(page2.entries).toHaveLength(10);
});
```

---

## Checklist for Refactoring a Test File

- [ ] Remove `vi.mock()` calls for Prisma
- [ ] Add TestDataFactory imports and setup
- [ ] Add `beforeEach` hook to get Prisma client and factory
- [ ] Replace mock data creation with `factory.create*()` calls
- [ ] Ensure proper FK relationships (create parent records first)
- [ ] Use camelCase field names
- [ ] Remove mock expectations (`vi.mocked()` calls)
- [ ] Test actual behavior, not mock calls
- [ ] Add proper assertions for created data
- [ ] Handle error cases naturally (no need to mock errors)
- [ ] Run tests to verify they pass
- [ ] Check that database cleanup works (tests are isolated)

---

## Tips and Best Practices

1. **Create parent records first**: Always create project, machine, etc. before creating child records
2. **Use descriptive names**: `createProject({ name: 'test-auth-project' })` is clearer than generic names
3. **Don't reuse IDs**: Let the database generate IDs, don't hardcode `id: 1`
4. **Test both success and error paths**: Not found, invalid input, FK violations, etc.
5. **Use unique values**: Factory adds timestamps to avoid conflicts
6. **Check FK constraints work**: Try creating orphaned records and expect errors
7. **Test actual queries**: Don't just test that data was created, test that queries return it correctly

---

## Common Issues and Solutions

### Issue: FK constraint violation

```
Error: Foreign key constraint violated on the constraint: `workspaces_project_id_fkey`
```

**Solution**: Create the parent record first:

```typescript
const project = await factory.createProject();
const workspace = await factory.createWorkspace({ projectId: project.id, ... });
```

### Issue: Unique constraint violation

```
Error: Unique constraint failed on the fields: (`email`)
```

**Solution**: TestDataFactory adds timestamps automatically, but if you're manually creating data:

```typescript
const user1 = await factory.createUser({ email: 'user1@example.com' });
const user2 = await factory.createUser({ email: 'user2@example.com' });
```

### Issue: Wrong field names (camelCase vs snake_case)

```
Error: Unknown field 'agent_id'
```

**Solution**: Use camelCase (Prisma convention):

```typescript
// ❌ Wrong
{ agent_id: 'copilot', project_id: 1 }

// ✅ Correct
{ agentId: 'copilot', projectId: 1 }
```

---

## Success Metrics

After refactoring a test file:

- ✅ All tests should pass
- ✅ No `vi.mock()` calls for database
- ✅ Tests use TestDataFactory
- ✅ Tests are isolated (can run in any order)
- ✅ FK relationships are correct
- ✅ Tests catch real database issues

---

## Next Steps

1. Start with simpler services (fewer dependencies)
2. Refactor one test file at a time
3. Run tests frequently to catch issues early
4. Commit after each successful refactoring
5. Update this guide if you discover new patterns

---

**Related Files**:

- Test utilities: `tools/test-utils/src/`
- Test setup: `packages/core/vitest.setup.ts`
- Factory implementation: `tools/test-utils/src/factories.ts`
- Database utilities: `tools/test-utils/src/database.ts`
