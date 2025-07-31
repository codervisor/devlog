# Devlog - Long-Term Memory for AI-Assisted Development

A comprehensive development logging system that provides **persistent memory for AI assistants** working on large-scale coding projects. Built as a monorepo with MCP (Model Context Protocol) server capabilities, devlog solves the critical problem of AI memory loss during extended development sessions by maintaining structured, searchable logs of tasks, decisions, and progress.

## 🧠 The Problem: AI Memory Loss in Development

AI assistants face significant **memory limitations** when working on large codebases:
- **Context window constraints** limit how much code can be processed at once
- **Session boundaries** cause loss of project understanding between conversations  
- **Catastrophic forgetting** leads to inconsistent code modifications
- **State management issues** result in duplicated or conflicting work

**Devlog provides the solution**: persistent, structured memory that maintains context across sessions, enabling AI assistants to work effectively on large projects over extended periods.

> 📚 **Learn More**: Read our comprehensive analysis of [AI Memory Challenges in Development](docs/reference/ai-agent-memory-challenge.md) to understand why persistent logging is essential for AI-assisted coding.

## 📦 Architecture

This monorepo contains three core packages that work together to provide persistent memory for development:

### `@codervisor/devlog-core` 
Core devlog management functionality including:
- **TypeScript types**: All shared types and interfaces for type safety and consistency
- **Storage backends**: SQLite, PostgreSQL, MySQL support
- **CRUD operations**: Create, read, update, delete devlog entries
- **Search & filtering**: Find entries by keywords, status, type, or priority
- **Memory persistence**: Maintain state across AI sessions
- **Integration services**: Sync with enterprise platforms (Jira, GitHub, Azure DevOps)

### `@codervisor/devlog-mcp`
MCP (Model Context Protocol) server that exposes core functionality to AI assistants:
- **15+ specialized tools** for devlog management
- **Standardized MCP interface** for broad AI client compatibility
- **Real-time memory access** during AI conversations
- **Session persistence** across multiple interactions

### `@codervisor/devlog-web`
Next.js web interface for visual devlog management:
- **Dashboard view** of all development activities
- **Timeline visualization** of project progress
- **Search and filtering UI** for finding relevant context
- **Manual entry management** for human developers

## ✨ Key Features

### 🧠 **Persistent AI Memory**
- **Cross-session continuity**: Maintain context between AI conversations
- **Long-term project memory**: Remember decisions, patterns, and insights
- **Context reconstruction**: Quickly restore project understanding
- **Memory search**: Find relevant past work and decisions

### 📋 **Comprehensive Task Management**
- **Work type tracking**: Features, bugfixes, tasks, refactoring, documentation
- **Status workflows**: new → in-progress → blocked/review → testing → done
- **Priority management**: Low, medium, high, critical priority levels
- **Progress tracking**: Detailed notes with timestamps and categories

### 🔍 **Advanced Search & Discovery**
- **Semantic search**: Find entries by keywords across title, description, notes
- **Multi-dimensional filtering**: Status, type, priority, date ranges
- **Related work discovery**: Prevent duplicate efforts and build on existing work
- **Active context summaries**: Get current project state for AI assistants

### 🏢 **Enterprise Integration**
- **Platform sync**: Jira, Azure DevOps, GitHub Issues integration
- **Bidirectional updates**: Changes sync between devlog and external systems
- **Unified workflow**: Manage work across multiple platforms from one interface
- **Audit trails**: Track all changes and integrations

### 🛡️ **Data Integrity & Reliability**
- **Deterministic IDs**: Hash-based IDs prevent duplicates across sessions
- **Atomic operations**: Consistent data state even during interruptions
- **Multiple storage backends**: SQLite, PostgreSQL, MySQL support
- **Backup & recovery**: Built-in data protection mechanisms

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm 10.13.1+

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

Devlog provides seamless integration with AI assistants through the **Model Context Protocol (MCP)**:

- **15+ specialized tools** for memory management
- **Real-time context access** during AI conversations  
- **Session persistence** across multiple interactions
- **Automatic duplicate prevention** with smart ID generation

AI assistants can create entries, track progress, search past work, and maintain context across development sessions.

> 📖 **Technical Details**: See [docs/guides/EXAMPLES.md](docs/guides/EXAMPLES.md) for complete MCP tool documentation and usage examples.

## 📖 Documentation

### 🎯 **Start Here**
- **[AI Memory Challenge](docs/reference/ai-agent-memory-challenge.md)** - Why devlog exists and the problems it solves
- **[Usage Examples](docs/guides/EXAMPLES.md)** - Common workflows and usage patterns
- **[Quick Setup Guide](docs/README.md)** - Getting started documentation

### 🔧 **Setup & Configuration**
- **[Enterprise Integrations](docs/guides/INTEGRATIONS.md)** - Jira, Azure DevOps, GitHub setup
- **[GitHub Setup](docs/guides/GITHUB_SETUP.md)** - Detailed GitHub integration guide
- **[Testing Guide](docs/guides/TESTING.md)** - How to test the devlog system

### 🤝 **Contributing**
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project
- **[Development Guide](docs/guides/DEVELOPMENT.md)** - Development workflow and best practices

### 📁 **Complete Documentation**
See the [docs/](docs/) directory for comprehensive documentation including technical specifications and design documents.

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