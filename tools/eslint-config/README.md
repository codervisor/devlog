# @codervisor/eslint-config

Shared ESLint configuration for the devlog monorepo.

## Overview

This package provides ESLint configurations tailored for different project types in the monorepo:

- **Base**: TypeScript projects with import/export rules
- **React**: React applications with hooks and accessibility rules
- **Node**: Node.js applications with server-specific rules

## Installation

The package is automatically available in the monorepo workspace.

## Usage

### Base Configuration (TypeScript)

For TypeScript packages (core, shared, etc.):

```javascript
// eslint.config.js or .eslintrc.cjs
import config from '@codervisor/eslint-config';

export default config;
```

### React Configuration

For React applications (web app):

```javascript
// eslint.config.js
import { react } from '@codervisor/eslint-config';

export default react;
```

### Node.js Configuration

For Node.js packages (mcp, collector):

```javascript
// eslint.config.js
import { node } from '@codervisor/eslint-config';

export default node;
```

## Rules Overview

### Base Configuration

- **TypeScript**: Strict type checking, consistent type imports
- **Imports**: Organized import order, no duplicates
- **Code Quality**: No console.log (use proper logging), prefer const, etc.
- **Best Practices**: Promise handling, error handling

### React Configuration

Includes all base rules plus:

- **React**: Component patterns, JSX best practices
- **Hooks**: Rules of hooks enforcement
- **Accessibility**: WCAG compliance checks

### Node.js Configuration

Includes all base rules with:

- **Node.js**: Process handling, path operations
- **Logging**: Console allowed in Node.js environments

## Key Rules

### No Console Logs

```typescript
// ❌ Error
console.log('debug message');

// ✅ OK - Use proper logging
logger.info('message');
console.error('error'); // Allowed
console.warn('warning'); // Allowed
```

### Consistent Type Imports

```typescript
// ❌ Error
import { DevlogEntry } from './types';

// ✅ OK
import type { DevlogEntry } from './types';
```

### Import Order

```typescript
// ✅ OK - Organized imports
import fs from 'fs'; // Built-in
import { describe, it } from 'vitest'; // External
import type { DevlogEntry } from '@codervisor/devlog-shared'; // Internal
import { formatDate } from '../utils'; // Parent
import type { Config } from './types'; // Sibling
```

### Unused Variables

```typescript
// ❌ Error
function example(unused: string) {
  // ...
}

// ✅ OK - Prefix with underscore
function example(_unused: string) {
  // ...
}
```

## Customization

To extend or override rules in a specific package:

```javascript
// eslint.config.js
import config from '@codervisor/eslint-config';

export default {
  ...config,
  rules: {
    ...config.rules,
    // Your custom rules
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
```

## Integration with Prettier

This configuration is compatible with Prettier. It extends `eslint-config-prettier` to disable rules that conflict with Prettier formatting.

## Pre-commit Hooks

ESLint runs automatically on pre-commit via husky and lint-staged:

```bash
# Lint staged files
pnpm lint-staged
```

## CI/CD

ESLint runs in CI/CD pipelines to enforce code quality:

```bash
# Lint all files
pnpm lint

# Fix auto-fixable issues
pnpm lint --fix
```

## License

Apache-2.0
