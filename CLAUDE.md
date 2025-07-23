# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Devlog is a monorepo for AI-assisted development logging that provides **persistent memory for AI assistants** across development sessions. It prevents AI memory loss through structured, searchable logs and supports multiple storage backends (SQLite, PostgreSQL, GitHub).

## Package Architecture

This is a TypeScript ESM monorepo with three main packages:

### `@devlog/core`
Core functionality including:
- **WorkspaceDevlogManager**: Main interface for managing development logs across workspaces
- **Storage providers**: SQLite, PostgreSQL, MySQL, GitHub, and JSON file storage
- **TypeScript types**: All shared interfaces and types
- **Enterprise integrations**: Jira, Azure DevOps, GitHub sync
- **Time-series analytics**: Progress tracking and statistics

### `@devlog/mcp`
Model Context Protocol server that exposes devlog functionality to AI assistants:
- **MCPDevlogAdapter**: Main adapter class wrapping WorkspaceDevlogManager
- **15+ specialized tools**: Core operations, search, progress tracking, AI context, workspace management
- **Tool categories**: core-tools, search-tools, progress-tools, ai-context-tools, workspace-tools

### `@devlog/web`
Next.js web interface for visual management:
- **Dashboard**: Overview of development activities and progress
- **Real-time updates**: SSE (Server-Sent Events) for live updates
- **Workspace switching**: Multi-workspace support with UI
- **Monaco editor**: Code editing with syntax highlighting

## Common Commands

### Build Commands
```bash
# Build all packages (respects dependency order)
pnpm build

# Build specific packages
pnpm --filter @devlog/core build
pnpm --filter @devlog/mcp build
pnpm --filter @devlog/web build

# Build for testing (doesn't conflict with dev server)
pnpm build:test

# Build for Vercel deployment
pnpm build:vercel
```

### Development Commands
```bash
# Start MCP server for AI development
pnpm dev:mcp

# Start web interface with dependencies
pnpm dev:web

# Start individual packages
pnpm --filter @devlog/mcp dev
pnpm --filter @devlog/web dev
```

### Testing Commands
```bash
# Run all tests
pnpm test

# Run tests with watch mode
pnpm test:watch

# Run specific package tests
pnpm --filter @devlog/core test
pnpm --filter @devlog/mcp test

# Run integration tests
pnpm --filter @devlog/mcp test:integration

# Run tests with coverage
pnpm --filter @devlog/mcp test:coverage
```

## Key Architecture Components

### Storage Architecture
- **StorageProviderFactory**: Creates storage providers based on configuration
- **Multi-backend support**: SQLite (default), PostgreSQL, GitHub Issues, JSON files
- **Workspace isolation**: Each workspace can have different storage configuration
- **Configuration hierarchy**: Workspace config → Environment config → Defaults

### MCP Tool System
Tools are organized into categories:
- **Core tools**: create_devlog, update_devlog, list_devlogs, etc.
- **Search tools**: search_devlogs, discover_related_devlogs
- **Progress tools**: add_devlog_note, update_devlog_status
- **AI context tools**: get_context_for_ai, update_ai_context
- **Workspace tools**: workspace management and switching

### Workspace Management
- **FileWorkspaceManager**: Manages workspace configurations in JSON files
- **WorkspaceDevlogManager**: Main interface supporting multiple workspaces
- **Auto-workspace detection**: Automatically creates workspaces for new projects

## Development Best Practices

### TypeScript ESM Requirements
- **File extensions**: Always add `.js` to import paths for internal imports
- **Cross-package imports**: Use `@devlog/*` aliases for inter-package references
- **Avoid self-reference**: Don't use `@/` for intra-package imports

### Testing and Build Practices
- **Use `pnpm build:test`** instead of `pnpm build` when testing builds to avoid conflicts with dev servers
- **Build order matters**: Core → MCP → Web (follow dependency chain)
- **After core changes**: Always rebuild core package before restarting MCP server

### MCP Development Workflow
**CRITICAL**: This project uses ITSELF for development tracking. When working on devlog features:
1. **DISCOVER FIRST**: Always run `discover_related_devlogs` before creating new entries
2. **REVIEW**: Analyze discovered entries to understand context and avoid duplicates
3. **CREATE**: Only create new devlog entries if no overlapping work exists
4. **TRACK**: Update entries with progress notes and status changes

### UI Development
- **Use Playwright**: Required for React error debugging and UI validation
- **Console monitoring**: Always check for React errors with Playwright before concluding fixes
- **Single dev server**: Web app uses fixed port 3000, will fail if port is occupied

### Temporary Work
- **Use `tmp/` folder**: All temporary scripts, test files, and experimental code goes in `tmp/`
- **Not committed**: The `tmp/` folder is gitignored
- **Clean up**: Remove temporary files when no longer needed

## Configuration

### Environment Variables
- `DATABASE_URL`: Connection string for PostgreSQL
- `GITHUB_TOKEN`: GitHub API token for GitHub storage
- `JIRA_*`: Jira integration settings
- `AZURE_DEVOPS_*`: Azure DevOps integration settings

### Workspace Configuration
- Default path: `~/.devlog/workspaces.json`
- Per-workspace storage configuration
- Supports multiple storage backends per workspace

## Common Issues and Solutions

### Build Conflicts
- **Problem**: `pnpm build` conflicts with active dev servers
- **Solution**: Use `pnpm build:test` for testing builds

### TypeScript Resolution
- **Problem**: Cannot resolve imports with `.js` extensions
- **Solution**: This is correct for ESM - TypeScript strips `.js` extensions at compile time

### MCP Server Connection
- **Problem**: AI assistant cannot connect to MCP server
- **Solution**: Check that server is running with `pnpm dev:mcp` and configuration is correct

### Hot Reload Issues
- **Problem**: Changes not reflecting in development
- **Solution**: Restart the specific package dev server, ensure build dependencies are up to date