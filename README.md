# Devlog - AI Coding Agent Observability Platform

> **⚠️ Early Development**: This project is actively under development (~40-45% complete). Core infrastructure is in place, but not all features described below are fully implemented yet. See [Current Implementation Status](#-current-implementation-status) for details.

A comprehensive **AI coding agent observability platform** that provides complete visibility into AI-assisted development. Built as a monorepo with MCP (Model Context Protocol) integration, devlog helps developers and teams monitor, analyze, and optimize their AI coding workflows by tracking agent activities, measuring code quality, and delivering actionable insights.

## 🔍 The Vision: Complete AI Agent Transparency

Modern software development increasingly relies on AI coding agents, but teams face critical challenges:

- **Lack of visibility** into what AI agents are doing and why
- **Quality concerns** about AI-generated code
- **Debugging difficulties** when AI agents fail or produce incorrect results
- **Performance blind spots** in agent efficiency and cost
- **Compliance gaps** for audit trails and governance

**Devlog provides the solution**: A complete observability platform that captures, analyzes, and visualizes AI agent behavior, enabling teams to understand, optimize, and trust their AI-assisted development workflows.

## 📊 Current Implementation Status

**Overall Progress**: ~40-45% complete (as of November 2025)

| Component               | Status             | Completion | Notes                                               |
| ----------------------- | ------------------ | ---------- | --------------------------------------------------- |
| **Backend Services**    | 🚧 Mostly Complete | 85%        | AgentEventService, AgentSessionService implemented  |
| **Database Schema**     | ✅ Complete        | 100%       | PostgreSQL + TimescaleDB schema ready               |
| **Frontend UI**         | ✅ Complete        | 100%       | 16 React components, dashboard, sessions view       |
| **Go Collector**        | 🚧 In Progress     | 65%        | Core infrastructure done, test stabilization needed |
| **API Endpoints**       | ❌ Not Started     | 0%         | Critical blocker for integration                    |
| **Historical Backfill** | ❌ Not Started     | 0%         | High priority for importing existing logs           |
| **MCP Integration**     | ⏸️ Deferred        | 0%         | Low priority                                        |
| **Analytics Engine**    | ⏸️ Planned         | 0%         | Phase 3 feature                                     |
| **Enterprise Features** | ⏸️ Planned         | 0%         | Phase 4 feature                                     |

### What Works Now

- ✅ Database schema and migrations
- ✅ Core TypeScript services for event and session management
- ✅ React-based web UI for viewing sessions
- ✅ Go collector binary builds successfully (~15MB)
- ✅ GitHub Copilot log monitoring adapter

### Critical Next Steps

1. **API Endpoints** - Create REST endpoints to connect frontend to backend
2. **Historical Backfill** - Import existing AI agent logs
3. **Integration Testing** - Validate end-to-end data flow
4. **Test Stabilization** - Fix failing tests in Go collector

### Deferred (Low Priority)

- Additional agent adapters (Claude, Cursor)
- NPM package distribution
- MCP protocol integration
- Advanced analytics and intelligence features
- Enterprise collaboration features

> 📖 **Detailed Status**: See [specs/20251021/001-ai-agent-observability/README.md](specs/20251021/001-ai-agent-observability/README.md) for complete implementation tracking.

## 🎯 Core Capabilities (Vision)

> **Note**: The capabilities listed below represent the full vision. See [Implementation Status](#-current-implementation-status) above for what's currently available.

### 1. AI Agent Activity Monitoring

- **Real-time tracking** of all AI agent actions (file operations, LLM calls, commands)
- **Session management** for complete workflow visibility
- **Visual timelines** showing agent behavior over time
- **Live dashboards** for monitoring active agent sessions

### 2. Performance & Quality Analytics

- **Agent performance metrics** (speed, efficiency, token usage)
- **Code quality assessment** for AI-generated code
- **Comparative analysis** across different AI agents and models
- **Cost optimization** insights and recommendations

### 3. Intelligent Insights & Recommendations

- **Pattern recognition** to identify success and failure modes
- **Quality scoring** for AI-generated code
- **Smart recommendations** for prompt optimization and workflow improvements
- **Automated reporting** on agent performance and outcomes

### 4. Enterprise Compliance & Collaboration

- **Complete audit trails** for all AI-assisted code changes
- **Team collaboration** features for sharing learnings
- **Policy enforcement** for AI agent usage
- **Integration ecosystem** with GitHub, Jira, Slack, and more

> 📚 **Learn More**: Read about [AI Memory Challenges in Development](docs/reference/ai-agent-memory-challenge.md) and our [AI Agent Observability Design](docs/design/ai-agent-observability-design.md).

## 🏗️ Supported AI Agents

Devlog is designed to support observability for all major AI coding assistants:

**Currently Supported**:

- ✅ **GitHub Copilot** - Log adapter implemented and tested

**Planned Support** (adapters not yet implemented):

- ⏸️ **Claude Code** (Anthropic)
- ⏸️ **Cursor AI**
- ⏸️ **Gemini CLI** (Google)
- ⏸️ **Cline** (formerly Claude Dev)
- ⏸️ **Aider**
- ⏸️ Any **MCP-compatible** AI coding assistant (MCP integration deferred)

> **Note**: The collector architecture supports adding new adapters. Additional agent support is deferred until core integration is complete.

## 📦 Architecture

This monorepo contains packages for comprehensive AI agent observability. **Status indicators**: ✅ Implemented | 🚧 Partial | ⏸️ Planned

### `@codervisor/devlog-core` ✅ **85% Complete**

Core services and data models:

- ✅ **TypeScript types**: Complete type definitions for events, sessions, and analytics
- ✅ **Event collection**: AgentEventService with context enrichment (~600 LOC)
- ✅ **Session management**: AgentSessionService for workflow tracking (~600 LOC)
- ✅ **Storage backends**: PostgreSQL with TimescaleDB schema ready
- ⏸️ **Analytics engine**: Planned for Phase 3
- ⏸️ **Integration services**: Planned for Phase 4

### `@codervisor/devlog-collector` 🚧 **65% Complete**

Go-based lightweight collector binary (~15MB):

- ✅ **CLI interface**: Start/status/version commands with Cobra
- ✅ **File watcher**: Real-time log monitoring with fsnotify
- ✅ **SQLite buffer**: Offline support for event storage
- ✅ **Copilot adapter**: GitHub Copilot log parsing (78.6% test coverage)
- ✅ **HTTP client**: Event transmission with retry logic
- 🚧 **Integration**: End-to-end testing and validation in progress
- ⏸️ **Additional adapters**: Claude, Cursor (deferred)

### `@codervisor/devlog-mcp` ⏸️ **Deferred (Low Priority)**

MCP (Model Context Protocol) server for AI agent integration:

- ⏸️ MCP tools for event logging and querying (planned)
- ⏸️ Real-time event streaming (planned)
- ⏸️ Session tracking with automatic context capture (planned)

### `@codervisor/devlog-ai` ⏸️ **Planned (Phase 3)**

AI-powered analysis and insights:

- ⏸️ Pattern recognition
- ⏸️ Quality analysis
- ⏸️ Recommendation engine
- ⏸️ Predictive analytics

### `@codervisor/devlog-web` ✅ **100% Complete (UI Only)**

Next.js web interface (16 React components built):

- ✅ **Dashboard**: Active sessions view
- ✅ **Sessions page**: Browse and filter sessions
- ✅ **Session details**: Event timeline and hierarchy
- ✅ **UI components**: Complete component library
- ❌ **API integration**: Not connected to backend yet (critical blocker)

## ✨ Key Features

### 🔍 **Complete Activity Visibility**

- **Real-time monitoring**: See what AI agents are doing as they work
- **Event capture**: Log every file read/write, LLM request, command execution, and error
- **Session tracking**: Group related activities into complete workflows
- **Timeline visualization**: Visual replay of agent behavior with interactive controls

### 📊 **Performance & Quality Analytics**

- **Agent comparison**: Side-by-side performance of different AI assistants
- **Quality metrics**: Assess correctness, maintainability, and security of AI-generated code
- **Cost analysis**: Track token usage and optimize for efficiency
- **Trend analysis**: Monitor improvements and regressions over time

### 🧠 **Intelligent Insights**

- **Pattern detection**: Automatically identify what leads to success or failure
- **Smart recommendations**: Get suggestions for better prompts and workflows
- **Anomaly detection**: Flag unusual behavior and potential issues
- **Predictive analytics**: Forecast session outcomes and quality scores

### 👥 **Team Collaboration**

- **Shared learnings**: Browse and learn from team members' successful sessions
- **Prompt library**: Curated collection of effective prompts
- **Best practices**: Automatically extracted from successful patterns
- **Team analytics**: Understand team-wide AI usage and effectiveness

### 🛡️ **Enterprise Ready**

- **Complete audit trails**: Every AI action logged with full context
- **Policy enforcement**: Rules for AI agent behavior and usage
- **Access control**: Fine-grained permissions for data access
- **Compliance**: SOC2, ISO 27001, GDPR support with data retention policies

### 🔌 **Extensible Integration**

- **Version control**: GitHub, GitLab, Bitbucket integration
- **Issue tracking**: Jira, Linear, GitHub Issues sync
- **CI/CD**: GitHub Actions, Jenkins, CircleCI hooks
- **Communication**: Slack, Teams, Discord notifications
- **API access**: REST and GraphQL APIs for custom integrations

## 🚀 Quick Start

> **⚠️ Development Status**: The project is currently under active development. The web UI and Go collector build successfully, but API integration is not yet complete. Full end-to-end functionality is coming soon.

### Prerequisites

- Node.js 20+
- pnpm 10.15.0+
- PostgreSQL 14+ (for backend services)
- Go 1.23+ (for collector development)

### Installation

```bash
# Clone the repository
git clone https://github.com/codervisor/devlog.git
cd devlog

# Install dependencies
pnpm install

# Generate Prisma client
npx prisma generate

# Build all packages (Note: Go collector build may take a few minutes)
pnpm build
```

### Current Capabilities

#### 1. View the Web Interface (UI Only)

```bash
# Start the web development server
pnpm dev:web
# Access at http://localhost:3000
```

**Note**: The UI is fully built but currently uses mock data. API endpoints are not yet implemented.

#### 2. Build the Go Collector

```bash
# Build the collector binary
cd packages/collector
make build
# Binary available at: bin/devlog-collector

# Test the CLI
./bin/devlog-collector --help
```

**Note**: The collector builds successfully and can monitor GitHub Copilot logs, but backend integration is pending.

#### 3. ⏸️ MCP Integration (Not Yet Available)

MCP server integration is deferred to a future phase. Focus is currently on:

1. Creating API endpoints to connect frontend to backend
2. Implementing historical backfill for existing logs
3. Stabilizing end-to-end integration

### What's Coming Next

1. **API Endpoints** - REST endpoints for `/api/sessions` and `/api/events`
2. **Historical Backfill** - Import existing AI agent logs
3. **Full Integration** - Connect web UI → API → database → collector
4. **End-to-End Testing** - Validate complete data flow

## ⚙️ Configuration

> **Note**: Full configuration documentation will be updated once API integration is complete.

Devlog is designed to support multiple storage backends (SQLite, PostgreSQL, MySQL) and enterprise integrations (Jira, GitHub, Azure DevOps).

```bash
# Copy example configuration
cp .env.example .env
# Edit .env with your settings
```

> 📖 **Configuration Guide**: See [docs/guides/INTEGRATIONS.md](docs/guides/INTEGRATIONS.md) for complete setup instructions including database configuration and enterprise platform integration.

## 🤖 AI Integration

> **⚠️ Status**: MCP integration is deferred to a future phase. Current focus is on Go collector and API development.

Devlog is designed to provide seamless integration with AI coding agents through multiple channels:

### ⏸️ MCP Protocol Integration (Planned)

MCP integration will provide:

- Standardized tools for event logging and session tracking
- Real-time streaming of agent activities
- Automatic context capture (project, files, git state)
- Compatibility with Claude, Copilot, and other MCP clients

**Status**: Deferred - not a current priority

### ✅ Agent-Specific Collectors (In Development)

The Go collector provides:

- ✅ **Log monitoring** for agents that write logs (GitHub Copilot implemented)
- ✅ **File watcher** with real-time log processing
- ✅ **Plugin architecture** for custom agent integrations
- ✅ **Flexible event mapping** to standardized schema
- 🚧 **HTTP transmission** to backend (integration pending)

**Status**: Core infrastructure complete, backend integration in progress

### Example Usage (Planned)

Once MCP integration is available:

```typescript
// Start tracking an agent session
mcp_agent_start_session({
  agentId: 'github-copilot',
  objective: 'Implement user authentication',
});

// Log agent events
mcp_agent_log_event({
  type: 'file_write',
  filePath: 'src/auth/login.ts',
  metrics: { tokenCount: 1200 },
});

// Get analytics and recommendations
mcp_agent_get_analytics({
  agentId: 'github-copilot',
  timeRange: { start: '2025-01-01', end: '2025-01-31' },
});
```

> 📖 **Documentation**: MCP integration guides will be available once the feature is implemented.

## 📖 Documentation

### 🎯 **Start Here**

- **[Implementation Status](specs/20251021/001-ai-agent-observability/README.md)** - Current progress tracking
- **[AI Agent Observability Design](docs/design/ai-agent-observability-design.md)** - Complete feature design
- **[Quick Reference](docs/design/ai-agent-observability-quick-reference.md)** - Fast overview of capabilities
- **[Implementation Checklist](docs/design/ai-agent-observability-implementation-checklist.md)** - Development roadmap
- **[AI Memory Challenge](docs/reference/ai-agent-memory-challenge.md)** - Why observability matters

### 🔧 **Setup & Usage**

> **Note**: Full documentation will be available once API integration is complete.

- **[Quick Setup Guide](docs/README.md)** - Getting started
- **[Agent Integration](docs/guides/agent-integration.md)** _(coming soon)_ - Connect your AI agents
- **[Dashboard Guide](docs/guides/dashboard-usage.md)** _(coming soon)_ - Using the web interface
- **[API Reference](docs/reference/api.md)** _(coming soon)_ - REST and GraphQL APIs

### 🤝 **Contributing**

- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute
- **[Development Guide](docs/guides/DEVELOPMENT.md)** - Development workflow

### 📁 **Complete Documentation**

See the [docs/](docs/) directory for all documentation including design documents, guides, and technical specifications.

## 🔧 Using the Core Library

The `@codervisor/devlog-core` package can be used directly in your applications:

```typescript
import { WorkspaceDevlogManager } from '@codervisor/devlog-core';

const devlog = new WorkspaceDevlogManager({
  fallbackToEnvConfig: true,
  createWorkspaceConfigIfMissing: true,
});

await devlog.initialize();

// Create and manage development logs programmatically
const entry = await devlog.createDevlog({
  title: 'Implement user authentication',
  type: 'feature',
  description: 'Add JWT-based authentication system',
});
```

> 📖 **API Documentation**: See [docs/guides/EXAMPLES.md](docs/guides/EXAMPLES.md) for complete API documentation and usage examples.

---

## 📝 License

Apache 2.0 License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

## 🆘 Support

- **Documentation**: [docs/](docs/) directory
- **Issues**: [GitHub Issues](https://github.com/codervisor/devlog/issues)
- **Discussions**: [GitHub Discussions](https://github.com/codervisor/devlog/discussions)
