# Devlog - AI Coding Agent Observability Platform

A comprehensive **AI coding agent observability platform** that provides complete visibility into AI-assisted development. Built as a monorepo with MCP (Model Context Protocol) integration, devlog helps developers and teams monitor, analyze, and optimize their AI coding workflows by tracking agent activities, measuring code quality, and delivering actionable insights.

## 🔍 The Vision: Complete AI Agent Transparency

Modern software development increasingly relies on AI coding agents, but teams face critical challenges:
- **Lack of visibility** into what AI agents are doing and why
- **Quality concerns** about AI-generated code
- **Debugging difficulties** when AI agents fail or produce incorrect results
- **Performance blind spots** in agent efficiency and cost
- **Compliance gaps** for audit trails and governance

**Devlog provides the solution**: A complete observability platform that captures, analyzes, and visualizes AI agent behavior, enabling teams to understand, optimize, and trust their AI-assisted development workflows.

## 🎯 Core Capabilities

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

Devlog supports observability for all major AI coding assistants:
- **GitHub Copilot** & GitHub Coding Agent
- **Claude Code** (Anthropic)
- **Cursor AI**
- **Gemini CLI** (Google)
- **Cline** (formerly Claude Dev)
- **Aider**
- Any **MCP-compatible** AI coding assistant

## 📦 Architecture

This monorepo contains four core packages working together to provide comprehensive AI agent observability:

### `@codervisor/devlog-core` 
Core services and data models including:
- **TypeScript types**: Complete type definitions for events, sessions, and analytics
- **Event collection**: High-performance capture of agent activities
- **Session management**: Track complete agent working sessions
- **Storage backends**: PostgreSQL with TimescaleDB for time-series events
- **Analytics engine**: Metrics calculation, pattern detection, quality analysis
- **Integration services**: Sync with GitHub, Jira, and other platforms

### `@codervisor/devlog-mcp`
MCP (Model Context Protocol) server for AI agent integration:
- **15+ observability tools** for event logging and querying
- **Agent collectors** for major AI coding assistants
- **Real-time event streaming** during agent sessions
- **Session tracking** with automatic context capture

### `@codervisor/devlog-ai`
AI-powered analysis and insights:
- **Pattern recognition**: Identify successful and problematic patterns
- **Quality analysis**: Assess AI-generated code quality
- **Recommendation engine**: Suggest optimizations and improvements
- **Predictive analytics**: Forecast outcomes and potential issues

### `@codervisor/devlog-web`
Next.js web interface for visualization and analytics:
- **Real-time dashboard**: Monitor active agent sessions
- **Interactive timeline**: Visual replay of agent activities
- **Analytics views**: Performance, quality, and cost metrics
- **Session explorer**: Browse and analyze historical sessions
- **Reports**: Automated insights and team analytics

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

### Prerequisites
- Node.js 18+ 
- pnpm 10.15.0+

### Installation

```bash
# Clone the repository
git clone https://github.com/codervisor/devlog.git
cd devlog

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Basic Usage

#### 1. Start the MCP Server (for AI assistants)
```bash
pnpm start
# or with auto-rebuild during development
pnpm dev:mcp
```

#### 2. Start the Web Interface (for humans)
```bash
pnpm dev:web
# Access at http://localhost:3000
```

#### 3. Configure AI Client
Add to your MCP client configuration:
```json
{
  "mcpServers": {
    "devlog": {
      "command": "node",
      "args": ["/path/to/devlog/packages/mcp/build/index.js"]
    }
  }
}
```

## ⚙️ Configuration

Devlog supports multiple storage backends (SQLite, PostgreSQL, MySQL) and enterprise integrations (Jira, GitHub, Azure DevOps).

```bash
# Copy example configuration
cp .env.example .env
# Edit .env with your settings
```

> 📖 **Configuration Guide**: See [docs/guides/INTEGRATIONS.md](docs/guides/INTEGRATIONS.md) for complete setup instructions including database configuration and enterprise platform integration.

## 🤖 AI Integration

Devlog provides seamless integration with AI coding agents through multiple channels:

### MCP Protocol Integration
- **Standardized tools** for event logging and session tracking
- **Real-time streaming** of agent activities
- **Automatic context capture** (project, files, git state)
- **Compatible** with Claude, Copilot, and other MCP clients

### Agent-Specific Collectors
- **Log monitoring** for agents that write logs
- **API interceptors** for programmatic access
- **Plugin architecture** for custom agent integrations
- **Flexible event mapping** to standardized schema

### Key MCP Tools
```typescript
// Start tracking an agent session
mcp_agent_start_session({
  agentId: "github-copilot",
  objective: "Implement user authentication"
});

// Log agent events
mcp_agent_log_event({
  type: "file_write",
  filePath: "src/auth/login.ts",
  metrics: { tokenCount: 1200 }
});

// Get analytics and recommendations
mcp_agent_get_analytics({
  agentId: "github-copilot",
  timeRange: { start: "2025-01-01", end: "2025-01-31" }
});
```

> 📖 **Getting Started**: See [Agent Integration Guide](docs/guides/agent-integration.md) _(coming soon)_ and [MCP Tools Reference](docs/reference/mcp-tools.md) _(coming soon)_ for complete documentation.

## 📖 Documentation

### 🎯 **Start Here**
- **[AI Agent Observability Design](docs/design/ai-agent-observability-design.md)** - Complete feature design
- **[Quick Reference](docs/design/ai-agent-observability-quick-reference.md)** - Fast overview of capabilities
- **[Implementation Checklist](docs/design/ai-agent-observability-implementation-checklist.md)** - Development roadmap
- **[AI Memory Challenge](docs/reference/ai-agent-memory-challenge.md)** - Why observability matters

### 🔧 **Setup & Usage**
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
  description: 'Add JWT-based authentication system'
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