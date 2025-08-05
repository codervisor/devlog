# Contributing to Devlog Tools

This is a monorepo containing development logging tools and utilities. This document explains the project structure and development workflow.

## Project Structure

```
/
├── package.json                 # Root workspace configuration
├── packages/
│   ├── core/                   # Core devlog management + TypeScript types
│   │   ├── package.json        # Package-specific dependencies and scripts
│   │   ├── src/               # Source code including types/
│   │   └── build/             # Compiled output
│   ├── mcp/                   # MCP server for development logging
│   │   ├── package.json        # Package-specific dependencies and scripts
│   │   ├── src/               # Source code
│   │   └── build/             # Compiled output
│   ├── web/                   # Next.js web interface
│   │   ├── package.json        # Package-specific dependencies and scripts
│   │   ├── app/               # Next.js App Router pages
│   │   └── build/             # Compiled output
│   └── [future packages]/     # Space for additional packages
├── .vscode/                   # VS Code workspace configuration
└── README.md                  # Main documentation
```

## Development Workflow

### Initial Setup

```bash
# Install all dependencies for all packages
pnpm install

# Build all packages
pnpm build
```

### Working with Packages

```bash
# Build all packages
pnpm build

# Build only the MCP server
pnpm build:mcp

# Build only the core package  
pnpm build:core

# Build only the web package
pnpm build:web

# Start the MCP server
pnpm start

# Run the MCP server in development mode
pnpm dev

# Run tests for all packages
pnpm test

# Clean build artifacts from all packages
pnpm clean
```

### Working with Individual Packages

You can also work directly with individual packages using pnpm filters:

```bash
# Work on the MCP server package
pnpm --filter @codervisor/devlog-mcp build
pnpm --filter @codervisor/devlog-mcp dev

# Work on the core package
pnpm --filter @codervisor/devlog-core build
pnpm --filter @codervisor/devlog-core dev

# Work on the web package
pnpm --filter @codervisor/devlog-web build
pnpm --filter @codervisor/devlog-web dev

# Install dependencies for a specific package
pnpm --filter @codervisor/devlog-mcp add some-dependency
```

## Adding New Packages

When adding a new package to the monorepo:

1. Create a new directory in `packages/`
2. Add a `package.json` with a scoped name (e.g., `@codervisor/devlog-package-name`)
3. Update the root `tsconfig.json` to include the new package reference
4. Update this document

## Architecture Decisions

### Monorepo Benefits

- **Shared tooling**: Common TypeScript, linting, and build configurations
- **Code sharing**: Easy to share types and utilities between packages
- **Atomic changes**: Changes across multiple packages can be made in single commits
- **Simplified dependency management**: Unified dependency resolution

### Package Structure

- `@codervisor/devlog-core`: Core devlog management functionality, file system operations, CRUD, and all shared TypeScript types
- `@codervisor/devlog-mcp`: MCP server implementation that wraps the core functionality
- `@codervisor/devlog-web`: Next.js web interface for browsing and managing devlogs
- Future packages might include:
  - `@codervisor/devlog-cli`: Command-line interface for devlog management
  - `@codervisor/devlog-utils`: Shared utilities

## Build System

The project uses pnpm workspaces with TypeScript project references for efficient builds:

- `pnpm-workspace.yaml` defines the workspace structure
- Root `tsconfig.json` references all packages
- `pnpm` manages dependencies and scripts efficiently

### pnpm Workspace Commands

- `pnpm -r <command>` - Run command in all packages
- `pnpm --filter <package> <command>` - Run command in specific package
- `pnpm --filter <pattern> <command>` - Run command in packages matching pattern

## Testing

Each package should include its own tests. The root workspace provides commands to run tests across all packages.
