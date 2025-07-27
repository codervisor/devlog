# @codervisor/devlog-mcp

Model Context Protocol (MCP) server for managing development logs and working notes.

## Features

- **Task Management**: Create and track features, bugfixes, tasks, refactoring, and documentation work
- **Structured Notes**: Timestamped notes with categories (progress, issues, solutions, ideas, reminders)
- **Status Tracking**: Track work through new → in-progress → blocked/in-review → testing → done
- **Priority Management**: Assign and filter by priority levels (low, medium, high, critical)
- **Search & Filter**: Find devlogs by keywords, status, type, or priority
- **Active Context**: Get a summary of current work for AI context
- **File Tracking**: Keep track of which files were modified
- **Code Change Summaries**: Document what code changes were made

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
# Start the MCP server
npm run start

# Start in development mode
npm run dev

# Run tests
npm run test
```

## Available Tools

### `create_devlog`

Create a new devlog entry for a task, feature, or bugfix.

### `update_devlog`

Update an existing devlog entry with progress, notes, or status changes.

### `get_devlog`

Retrieve a specific devlog entry by ID.

### `list_devlogs`

List devlog entries with optional filtering by status, type, or priority.

### `search_devlogs`

Search devlog entries by keywords in title, description, or notes.

### `get_active_context`

Get a summary of current active work for AI context.

### `archive_devlog`

Archive a completed devlog entry.

### `get_devlog_stats`

Get statistics about devlog entries.

## Configuration

The MCP server stores all data locally in a `.devlog` directory within your project. No external configuration is
required.
