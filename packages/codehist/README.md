# @devlog/codehist

GitHub Copilot Chat History Extractor - TypeScript implementation for the devlog ecosystem.

## Features

- **Extract Real Chat History**: Discovers and parses actual GitHub Copilot chat sessions from VS Code data directories
- **Cross-Platform Support**: Works with VS Code, VS Code Insiders, and other variants across Windows, macOS, and Linux
- **Multiple Export Formats**: Export to JSON and Markdown
- **Search Functionality**: Search through chat content to find specific conversations
- **Statistics**: View usage statistics and patterns
- **TypeScript Native**: Fully typed implementation with modern Node.js tooling

## Installation

```bash
# Install dependencies
pnpm install

# Build the package
pnpm --filter @devlog/codehist build
```

## Usage

### Command Line Interface

```bash
# Show chat statistics
npx @devlog/codehist stats

# List all chat sessions
npx @devlog/codehist chat

# Search chat content
npx @devlog/codehist search "error handling"

# Export to JSON
npx @devlog/codehist export --format json --output chat_history.json

# Export to Markdown
npx @devlog/codehist export --format markdown --output chat_history.md
```

### Programmatic Usage

```typescript
import { CopilotParser, JSONExporter } from '@devlog/codehist';

// Parse chat data
const parser = new CopilotParser();
const data = await parser.discoverVSCodeCopilotData();

// Export to JSON
const exporter = new JSONExporter();
await exporter.exportChatData(data.toDict(), 'output.json');
```

## How It Works

CodeHist discovers GitHub Copilot chat sessions stored in VS Code's application data:

- **macOS**: `~/Library/Application Support/Code*/User/workspaceStorage/*/chatSessions/`
- **Windows**: `%APPDATA%/Code*/User/workspaceStorage/*/chatSessions/`
- **Linux**: `~/.config/Code*/User/workspaceStorage/*/chatSessions/`

Each chat session is stored as a JSON file containing the conversation between you and GitHub Copilot.

## Architecture

```
src/
├── models/           # TypeScript interfaces and types
├── parsers/          # VS Code data discovery and parsing
├── exporters/        # Export functionality (JSON, Markdown)
├── utils/           # Cross-platform utilities
├── cli/             # Command-line interface
└── index.ts         # Main exports
```

## Integration with Devlog

This package is part of the devlog monorepo ecosystem:

- **@devlog/core**: Shared utilities and types
- **@devlog/mcp**: MCP server integration for AI agents
- **@devlog/web**: Web interface for visualization (future)

## License

MIT License - see LICENSE file for details.
