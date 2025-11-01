# @codervisor/test-utils

Shared test utilities, mocks, and factories for testing across the devlog monorepo.

## Overview

This package provides reusable testing utilities to make writing tests easier and more consistent:

- **Factories**: Create mock data for tests
- **Mocks**: Pre-configured mocks for common dependencies
- **Setup**: Test environment configuration utilities

## Installation

The package is automatically available in the monorepo workspace.

## Usage

### Test Factories

Create mock data easily:

```typescript
import { createMockDevlogEntry, createMockProject } from '@codervisor/test-utils';

// Create a single mock entry
const entry = createMockDevlogEntry({
  title: 'Test Entry',
  status: 'in-progress',
});

// Create multiple entries
const entries = createMockDevlogEntries(5, { status: 'done' });

// Create a mock project
const project = createMockProject({ name: 'my-project' });
```

### Mocks

Use pre-configured mocks:

```typescript
import { createMockApiClient, createMockLogger } from '@codervisor/test-utils';

const apiClient = createMockApiClient();
const logger = createMockLogger();

// Use in tests
apiClient.get.mockResolvedValue({ data: { id: 1 } });
```

### Test Setup

Configure test environment:

```typescript
import { setupTest, describe, it, expect } from '@codervisor/test-utils';

describe('My Test Suite', () => {
  // Automatically resets ID counters and mocks
  setupTest();

  it('should work', () => {
    // Test code
  });
});
```

## Available Factories

### Devlog Entry

```typescript
createMockDevlogEntry(overrides?: Partial<DevlogEntry>): DevlogEntry
createMockDevlogEntries(count: number, overrides?: Partial<DevlogEntry>): DevlogEntry[]
```

### Project

```typescript
createMockProject(overrides?: Partial<Project>): Project
createMockProjects(count: number, overrides?: Partial<Project>): Project[]
```

### Agent Session

```typescript
createMockAgentSession(overrides?: Partial<AgentSession>): AgentSession
```

### Agent Event

```typescript
createMockAgentEvent(overrides?: Partial<AgentEvent>): AgentEvent
createMockAgentEvents(count: number, overrides?: Partial<AgentEvent>): AgentEvent[]
```

### ID Management

```typescript
resetIdCounter(): void  // Reset auto-incrementing IDs
```

## Available Mocks

### API Client

```typescript
const apiClient = createMockApiClient();
// Methods: get, post, put, delete, patch
```

### Database Client

```typescript
const db = createMockDatabaseClient();
// Methods: query, connect, disconnect, transaction
```

### Logger

```typescript
const logger = createMockLogger();
// Methods: debug, info, warn, error
```

### Timer

```typescript
const timer = createMockTimer();
timer.advance(1000);  // Advance time by 1 second
timer.now();          // Get current mock time
```

## Test Setup Utilities

### Basic Setup

```typescript
setupTest();  // Resets ID counters and clears mocks
```

### Integration Tests

```typescript
setupIntegrationTest();  // Similar to setupTest but for integration tests
```

### Test Environment

```typescript
const env = createTestEnvironment();

// Register cleanup
env.addCleanup(async () => {
  await database.disconnect();
});

// Run cleanup
await env.cleanup();
```

### Suppress Console

```typescript
suppressConsole();  // Suppress console output during tests
```

## Helpers

### Wait For

```typescript
import { waitFor } from '@codervisor/test-utils';

await waitFor(
  () => element.isVisible(),
  { timeout: 5000, interval: 100 }
);
```

## Best Practices

1. **Reset Between Tests**: Use `setupTest()` to ensure test isolation
2. **Consistent Data**: Use factories for consistent mock data
3. **Cleanup**: Always clean up resources using `createTestEnvironment()`
4. **Type Safety**: Leverage TypeScript for type-safe mocks

## Example Test

```typescript
import {
  describe,
  it,
  expect,
  setupTest,
  createMockDevlogEntry,
  createMockApiClient,
} from '@codervisor/test-utils';
import { DevlogService } from '../devlog-service';

describe('DevlogService', () => {
  setupTest();

  it('should create a devlog entry', async () => {
    const apiClient = createMockApiClient();
    const mockEntry = createMockDevlogEntry();

    apiClient.post.mockResolvedValue({ data: mockEntry });

    const service = new DevlogService(apiClient);
    const result = await service.create({ title: 'Test' });

    expect(result).toEqual(mockEntry);
    expect(apiClient.post).toHaveBeenCalledWith('/devlog', { title: 'Test' });
  });
});
```

## License

Apache-2.0
