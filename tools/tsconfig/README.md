# @codervisor/tsconfig

Shared TypeScript configurations for the devlog monorepo.

## Overview

This package provides reusable TypeScript configurations for different project types:

- **base.json**: Base configuration for all TypeScript projects
- **react.json**: Configuration for React applications (Next.js)
- **node.json**: Configuration for Node.js packages

## Usage

### Base Configuration

For general TypeScript packages:

```json
{
  "extends": "@codervisor/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### React Configuration

For React/Next.js applications:

```json
{
  "extends": "@codervisor/tsconfig/react.json"
}
```

### Node.js Configuration

For Node.js packages:

```json
{
  "extends": "@codervisor/tsconfig/node.json"
}
```

## Configuration Details

### Base Configuration

- **Strict Mode**: Full strict type checking enabled
- **Module**: ESNext with bundler resolution
- **Target**: ES2022
- **Emit**: Declaration files, source maps
- **Best Practices**: Unused locals/parameters errors, implicit returns errors

### React Configuration

Extends base with:

- **JSX**: React JSX transform (react-jsx)
- **DOM Types**: DOM and DOM.Iterable
- **Next.js**: Allow JS, isolated modules
- **Path Aliases**: `@/*` mapped to `src/*`
- **No Emit**: TypeScript is used for type checking only

### Node.js Configuration

Extends base with:

- **Node Types**: Node.js type definitions
- **Composite**: Enabled for project references
- **Emit**: Output to `dist/` directory

## Migration Guide

### Migrating Existing Packages

1. Install the shared config:

```bash
pnpm add -D @codervisor/tsconfig
```

2. Update `tsconfig.json`:

```json
{
  "extends": "@codervisor/tsconfig/node.json",
  "compilerOptions": {
    // Package-specific overrides
  }
}
```

3. Remove redundant options from your tsconfig

### Common Overrides

You can override specific options for your package:

```json
{
  "extends": "@codervisor/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./build",
    "paths": {
      "~/*": ["./src/*"]
    }
  }
}
```

## Best Practices

1. **Extend, Don't Replace**: Always extend the shared config
2. **Minimal Overrides**: Only override what's necessary
3. **Document Overrides**: Comment why you're overriding a setting
4. **Consistent Paths**: Use the same path aliases across packages

## TypeScript Version

These configurations are designed for TypeScript 5.0+.

## License

Apache-2.0
