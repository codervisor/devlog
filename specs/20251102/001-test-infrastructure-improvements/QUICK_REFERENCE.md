# Test Infrastructure - Quick Reference

## Quick Start

### 1. Using Test Database Utilities

```typescript
import { setupTestDatabase, cleanDatabase, teardownTestDatabase } from '@codervisor/test-utils';

describe('MyService', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma); // Clean slate for every test!
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should work', async () => {
    // Your test here
  });
});
```

### 2. Creating Test Data

```typescript
import { TestDataFactory } from '@codervisor/test-utils';

const factory = new TestDataFactory(prisma);

// Create individual entities
const project = await factory.createProject({ name: 'my-project' });
const user = await factory.createUser({ email: 'test@example.com' });
const machine = await factory.createMachine({ machineId: 'test-machine' });

// Create complete setup (project + machine + workspace)
const { project, machine, workspace } = await factory.createCompleteSetup();
```

### 3. Available Factory Methods

| Method                                  | Description                          |
| --------------------------------------- | ------------------------------------ |
| `createProject()`                       | Create a test project                |
| `createUser()`                          | Create a test user                   |
| `createMachine()`                       | Create a test machine                |
| `createWorkspace(projectId, machineId)` | Create a workspace                   |
| `createDevlogEntry(projectId)`          | Create a devlog entry                |
| `createChatSession(workspaceId)`        | Create a chat session                |
| `createAgentSession(projectId)`         | Create an agent session              |
| `createCompleteSetup()`                 | Create project + machine + workspace |

## Common Patterns

### Pattern 1: Test with Fresh Data

```typescript
it('should create devlog entry', async () => {
  const project = await factory.createProject();

  const entry = await devlogService.create({
    projectId: project.id,
    title: 'Test Entry',
    type: 'task',
  });

  expect(entry.id).toBeDefined();
});
```

### Pattern 2: Test with Multiple Entities

```typescript
it('should list projects with machines', async () => {
  const project = await factory.createProject();
  const machine = await factory.createMachine();
  await factory.createWorkspace(project.id, machine.id);

  const hierarchy = await hierarchyService.getProjectHierarchy(project.id);

  expect(hierarchy.machines).toHaveLength(1);
});
```

### Pattern 3: Test with Custom Data

```typescript
it('should handle specific user data', async () => {
  const user = await factory.createUser({
    email: 'specific@example.com',
    name: 'Specific User',
    isEmailVerified: false,
  });

  expect(user.isEmailVerified).toBe(false);
});
```

## Setup for New Packages

### 1. Add test-utils dependency

```bash
pnpm add -D --filter "@codervisor/your-package" "@codervisor/test-utils"
```

### 2. Create vitest.setup.ts

```typescript
// packages/your-package/vitest.setup.ts
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, cleanDatabase, teardownTestDatabase } from '@codervisor/test-utils';
import type { PrismaClient } from '@prisma/client';

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

### 3. Update vitest.config.ts

```typescript
// packages/your-package/vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config.base';

export default defineConfig(
  mergeConfig(baseConfig, {
    test: {
      setupFiles: ['./vitest.setup.ts'], // Add this line
    },
  }),
);
```

## Database Cleanup Order

The cleanup respects foreign key constraints:

```
ChatMessage → ChatSession
AgentEvent → AgentSession
DevlogDocument → DevlogNote → DevlogDependency → DevlogEntry
Workspace → Machine → Project
EmailVerificationToken → PasswordResetToken → UserProvider → User
```

## Troubleshooting

### "Cannot read properties of undefined"

**Problem**: Test trying to access database before setup  
**Solution**: Ensure `beforeAll` with `setupTestDatabase()` is present

### "Unique constraint failed"

**Problem**: Test data conflicting with previous test  
**Solution**: Ensure `beforeEach` with `cleanDatabase()` is running

### "Connection timeout"

**Problem**: Database not running  
**Solution**: Start database with `docker compose up -d`

### "Test takes too long"

**Problem**: Database cleanup or large data creation  
**Solution**:

- Reduce test data size
- Use `createCompleteSetup()` for quick hierarchy
- Check if database is healthy

## Environment Variables

```bash
# Test database URL (defaults to localhost)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/devlog_test"
```

## Running Tests

```bash
# All tests
pnpm test

# Specific package
pnpm --filter "@codervisor/devlog-core" test

# Specific test file
pnpm test src/services/__tests__/auth-service.test.ts

# Watch mode
pnpm test --watch
```

## See Also

- Full implementation details: `IMPLEMENTATION.md`
- Original spec: `README.md`
- Test utilities source: `tools/test-utils/src/`
