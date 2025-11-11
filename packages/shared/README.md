# @codervisor/devlog-shared

Shared types, constants, and utilities for the devlog system.

## Overview

This package provides the foundational types, constants, and pure utility functions used across all devlog packages. It has **zero dependencies** to ensure it can be used anywhere without conflicts.

## Features

- **Type Definitions**: Complete TypeScript types for all devlog entities
- **Constants**: Enums and constant values for status, types, priorities, etc.
- **Pure Utilities**: Side-effect-free helper functions for common operations

## Installation

```bash
pnpm add @codervisor/devlog-shared
```

## Usage

### Types

```typescript
import { DevlogEntry, DevlogStatus, AgentEvent } from '@codervisor/devlog-shared';

const entry: DevlogEntry = {
  id: 1,
  title: 'Implement authentication',
  type: 'feature',
  status: 'in-progress',
  // ...
};
```

### Constants

```typescript
import { DEVLOG_STATUSES, OPEN_STATUSES, isOpenStatus } from '@codervisor/devlog-shared';

// Check all statuses
console.log(DEVLOG_STATUSES); // ['new', 'in-progress', ...]

// Check if status is open
if (isOpenStatus('in-progress')) {
  // Work is active
}
```

### Utilities

```typescript
import { toKebabCase, formatDate, isValidEmail, formatBytes } from '@codervisor/devlog-shared';

// String utilities
toKebabCase('HelloWorld'); // 'hello-world'

// Date utilities
formatDate(new Date()); // 'Jan 1, 2025'

// Validation
isValidEmail('user@example.com'); // true

// Formatting
formatBytes(1024); // '1.00 KB'
```

## Package Structure

```
src/
├── types/          # TypeScript type definitions
│   ├── agent.ts    # Agent observability types
│   ├── devlog.ts   # Devlog entry types
│   ├── project.ts  # Project types
│   ├── event.ts    # Event types
│   └── api.ts      # API request/response types
├── constants/      # Constant values
│   ├── agent-types.ts
│   ├── devlog-status.ts
│   └── event-types.ts
└── utils/          # Pure utility functions
    ├── string.ts
    ├── date.ts
    ├── validation.ts
    └── formatting.ts
```

## Design Principles

1. **Zero Dependencies**: No runtime dependencies to avoid version conflicts
2. **Pure Functions**: All utilities are side-effect-free
3. **Type Safety**: Strict TypeScript with full type coverage
4. **Tree Shakeable**: Use ES modules for optimal bundling
5. **Well Documented**: JSDoc comments on all public APIs

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

## License

Apache-2.0
