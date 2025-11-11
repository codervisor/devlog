# @codervisor/devlog-mcp

Model Context Protocol (MCP) server for the **AI Coding Agent Observability Platform**.

This package provides MCP tools for AI assistants to monitor, log, and analyze their own activities, enabling complete visibility into AI-assisted development workflows.

## 🎯 Features

### 🔍 Agent Observability (Primary)

**Session Tracking:**
- Start and end agent sessions with clear objectives
- Track session outcomes (success, partial, failure, abandoned)
- Link sessions to projects and optional work items
- Get active session information in real-time

**Event Logging:**
- Log all agent activities (file operations, LLM requests, commands, etc.)
- Capture event context (working directory, git branch, file paths)
- Record performance metrics (duration, token count, lines changed)
- Support for event relationships and causality

**Analytics & Insights:**
- Query events with flexible filters
- Aggregate event statistics by type and severity
- Calculate session performance metrics
- Identify patterns and trends

### 📊 Project Management (Supporting)

**Optional tools for organization:**
- Project context switching
- Work item creation and tracking
- Document attachments
- Progress notes and status updates

## 📦 Installation

```bash
pnpm install @codervisor/devlog-mcp
pnpm build
```

## 🚀 Usage

### Starting the Server

```bash
# Production mode
pnpm start

# Development mode (auto-rebuild)
pnpm dev

# With default project
pnpm start --project 1
```

### MCP Client Configuration

Add to your MCP client configuration (e.g., Claude Desktop, Cursor):

```json
{
  "mcpServers": {
    "devlog": {
      "command": "node",
      "args": [
        "/path/to/devlog/packages/mcp/build/index.js"
      ],
      "env": {
        "DEVLOG_DEFAULT_PROJECT": "1"
      }
    }
  }
}
```

## 🛠️ Available Tools

### Agent Observability Tools (PRIMARY)

#### Session Management

**`agent_start_session`** - Start tracking an AI agent session
```typescript
{
  agentId: "github-copilot",
  projectId: 1,
  objective: "Implement user authentication",
  workItemId: 42  // Optional: link to work item
}
```

**`agent_end_session`** - Complete a session with outcome
```typescript
{
  sessionId: "session-uuid",
  outcome: "success",
  summary: "JWT auth implemented with tests"
}
```

**`agent_get_session`** - Retrieve session details

**`agent_query_sessions`** - Search sessions with filters

**`agent_get_active_sessions`** - List currently running sessions

#### Event Tracking

**`agent_log_event`** - Record an agent activity
```typescript
{
  type: "file_write",
  agentId: "github-copilot",
  sessionId: "session-uuid",
  context: {
    filePath: "src/auth/login.ts",
    workingDirectory: "/app"
  },
  data: { content: "..." },
  metrics: { duration: 1500, tokenCount: 1200 }
}
```

**`agent_query_events`** - Search events with filters

#### Analytics

**`agent_get_event_stats`** - Event metrics and aggregations

**`agent_get_session_stats`** - Session performance metrics

### Project Management Tools (SUPPORTING)

#### Project Context

**`list_projects`** - List all projects

**`get_current_project`** - Get active project

**`switch_project`** - Change active project context

#### Work Item Tracking

**`create_devlog`** - Create a work item (feature, bug, task)

**`update_devlog`** - Update work item status/progress

**`list_devlogs`** - List work items with filters

**`add_devlog_note`** - Add progress note

**`complete_devlog`** - Mark work item as complete

**`find_related_devlogs`** - Find similar work items

#### Document Management

**`upload_devlog_document`** - Attach file to work item

**`list_devlog_documents`** - List attachments

**`get_devlog_document`** - Retrieve document

**`delete_devlog_document`** - Remove attachment

**`search_devlog_documents`** - Search documents

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/devlog

# Default project
DEVLOG_DEFAULT_PROJECT=1

# Optional: LLM for AI analysis
OPENAI_API_KEY=your_key_here
```

### Storage

The server uses PostgreSQL with TimescaleDB for efficient time-series event storage. Configure via `DATABASE_URL` environment variable.
