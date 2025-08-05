# @codervisor/devlog-ai

AI Chat History Extractor & Docker-based Automation - TypeScript implementation for GitHub Copilot and other AI coding assistants in the devlog ecosystem.

## Features

### Chat History Analysis

- **Extract Real Chat History**: Discovers and parses actual AI chat sessions from VS Code data directories
- **Multi-AI Support**: Currently supports GitHub Copilot, with planned support for Cursor, Claude Code, and other AI assistants
- **Cross-Platform Support**: Works with VS Code, VS Code Insiders, and other variants across Windows, macOS, and Linux
- **Multiple Export Formats**: Export to JSON and Markdown
- **Search Functionality**: Search through chat content to find specific conversations
- **Statistics**: View usage statistics and patterns
- **Devlog Integration**: Seamlessly integrates with the devlog core system for enhanced project management

### 🤖 Docker-based Automation (NEW!)

- **Automated Copilot Testing**: Run containerized VS Code Instances with GitHub Copilot for automated code generation testing
- **Scenario-Based Testing**: Pre-built test scenarios for algorithms, APIs, data processing, and more
- **Real-time Interaction Capture**: Monitor and capture Copilot suggestions and user interactions in real-time
- **Comprehensive Reporting**: Export detailed automation results with metrics, statistics, and analysis
- **Multiple Programming Languages**: Support for JavaScript, TypeScript, Python, and more
- **Docker Orchestration**: Automated container lifecycle management with VS Code Insiders and extensions

### Technical Features

- **TypeScript Native**: Fully typed implementation with modern Node.js tooling
- **ESM Support**: Modern ES modules with proper .js extensions for runtime compatibility
- **Extensible Architecture**: Plugin-based parser system for adding new AI assistants
- **Performance Optimized**: Streaming and batch processing for large datasets
- **Type Safety**: Strict TypeScript with minimal `any` usage and proper error handling
- **Comprehensive Testing**: Full test coverage with vitest

## Installation

```bash
# Install dependencies
pnpm install

# Build the package
pnpm --filter @codervisor/devlog-ai build
```

## Usage

### Command Line Interface

#### Chat History Analysis

```bash
npx @codervisor/devlog-ai stats

# Search chat sessions with filters
npx @codervisor/devlog-ai chat

# Search with advanced filters
npx @codervisor/devlog-ai search "error handling" --limit 20

# Export chat history
npx @codervisor/devlog-ai chat --format json --output chat_history.json
npx @codervisor/devlog-ai chat --format md --output chat_history.md
```

#### 🤖 Docker-based Automation

```bash
# Test Docker setup
npx @codervisor/devlog-ai automation test-setup

# List available scenarios
npx @codervisor/devlog-ai automation scenarios
npx @codervisor/devlog-ai automation scenarios --category algorithms --verbose

# List scenario categories
npx @codervisor/devlog-ai automation categories

# Run a specific scenario
npx @codervisor/devlog-ai automation run \
  --token YOUR_GITHUB_TOKEN \
  --scenarios algorithms,api \
  --language javascript \
  --count 5 \
  --output ./results \
  --debug

# Run with environment variable
export GITHUB_TOKEN=your_token_here
# Run multiple scenarios
npx @codervisor/devlog-ai automation run --scenarios testing --language python
```

### Programmatic Usage

#### Chat History Analysis

```typescript
import {
  CopilotParser,
  JSONExporter,
  MarkdownExporter,
  DefaultChatImportService,
  ChatHubService,
} from '@codervisor/devlog-ai';

// Parse chat data
const parser = new CopilotParser();
const data = await parser.discoverChatData();

// Search content
const results = parser.searchChatContent(data, 'async function');

// Export to JSON
const jsonExporter = new JSONExporter();
await jsonExporter.exportData(
  {
    chat_data: data.toDict(),
    statistics: stats,
  },
  'output.json',
);

// Export to Markdown
const mdExporter = new MarkdownExporter();
await mdExporter.exportChatData(
  {
    statistics: stats,
    chat_data: { chat_sessions: data.chat_sessions },
    search_results: results,
  },
  'report.md',
);

// Import to devlog system
const importService = new DefaultChatImportService(storageProvider);
const progress = await importService.importFromCopilot();
```

#### 🤖 Docker Automation

```typescript
import {
  DockerCopilotAutomation,
  CodeGenerationScenario,
  AutomationResultExporter,
} from '@codervisor/devlog-ai';

// Configure automation
const config = {
  githubToken: process.env.GITHUB_TOKEN!,
  timeout: 60000,
  debug: true,
  ports: { codeServer: 8080, vscode: 3000 },
};

// Get test scenarios
const scenarios = CodeGenerationScenario.getScenariosByCategory('algorithms');

// Run automation session
const automation = new DockerCopilotAutomation(config);
const sessionResult = await automation.runSession(scenarios);

// Export results
const exporter = new AutomationResultExporter();
await exporter.exportDetailedReport(sessionResult, './automation-results');

// Create custom scenarios
const customScenario = new CodeGenerationScenario({
  id: 'custom-test',
  name: 'Custom Algorithm Test',
  description: 'Test custom algorithm implementation',
  language: 'typescript',
  initialCode: 'function customSort(arr: number[]): number[] {\n  // TODO: implement\n}',
  expectedPrompts: ['if (arr.length <= 1)', 'return arr;'],
  timeout: 30000,
});

await automation.runSession([customScenario]);
```

## How It Works

### Chat History Discovery

AI-Chat discovers AI assistant chat sessions stored in VS Code's application data:

- **macOS**: `~/Library/Application Support/Code*/User/workspaceStorage/*/chatSessions/`
- **Windows**: `%APPDATA%/Code*/User/workspaceStorage/*/chatSessions/`
- **Linux**: `~/.config/Code*/User/workspaceStorage/*/chatSessions/`

Each chat session is stored as a JSON file containing the conversation between you and your AI assistant.

### 🤖 Docker Automation Architecture

The automation system creates isolated Docker containers with VS Code Insiders and GitHub Copilot to run reproducible tests:

#### Container Setup

1. **Base Image**: Ubuntu 22.04 with Node.js, Python, and development tools
2. **VS Code Insiders**: Latest insider build with GitHub Copilot extensions
3. **Code Server**: Web-based VS Code interface for automation control
4. **Test Environment**: Isolated workspace with pre-configured test files

#### Automation Flow

1. **Container Launch**: Docker container with VS Code Insiders starts
2. **Extension Loading**: GitHub Copilot and related extensions activate
3. **Scenario Execution**: Test scenarios run with simulated typing and interactions
4. **Real-time Capture**: Copilot suggestions and interactions are captured
5. **Result Collection**: Generated code, metrics, and interaction data collected
6. **Report Generation**: Comprehensive reports exported in multiple formats

#### Test Scenarios

- **Algorithm Implementation**: Binary search, sorting algorithms, data structures
- **API Development**: REST endpoints, error handling, middleware patterns
- **Data Processing**: Validation functions, transformations, parsing
- **Testing Patterns**: Unit tests, integration tests, mocking strategies
- **Security**: Input validation, sanitization, authentication patterns

## Configuration

### Docker Requirements

- Docker Desktop or Docker Engine installed and running
- Internet connection for pulling base images and VS Code components
- At least 2GB RAM available for containers
- GitHub token with Copilot access

### Environment Variables

```bash
# Required for automation
export GITHUB_TOKEN=your_personal_access_token

# Optional configuration
export DOCKER_AUTOMATION_PORT=8080        # Code server port
export DOCKER_AUTOMATION_TIMEOUT=60000    # Operation timeout (ms)
export DEBUG=1                            # Enable debug logging
```

### Automation Configuration

```typescript
interface AutomationConfig {
  githubToken: string; // Required: GitHub token for Copilot
  vscodeVersion?: string; // VS Code Insiders version (default: latest)
  ports?: {
    codeServer: number; // Code server port (default: 8080)
    vscode: number; // VS Code port (default: 3000)
  };
  timeout?: number; // Operation timeout (default: 60000ms)
  debug?: boolean; // Debug logging (default: false)
}
```

## Architecture

```
src/
├── models/              # TypeScript interfaces and types
├── parsers/             # VS Code data discovery and parsing
│   ├── base/            # Abstract base classes for AI providers
│   └── copilot/         # GitHub Copilot implementation
├── exporters/           # Export functionality (JSON, Markdown)
├── automation/          # 🤖 NEW: Docker-based automation layer
│   ├── docker/          # Container orchestration and management
│   ├── scenarios/       # Test scenario definitions and factories
│   ├── capture/         # Real-time interaction capture and parsing
│   ├── exporters/       # Automation result exporters
│   └── types/           # Automation-specific TypeScript types
├── utils/               # Cross-platform utilities
├── cli/                 # Command-line interface
│   ├── index.ts         # Main CLI with chat history commands
│   └── automation.ts    # Automation-specific CLI commands
└── index.ts             # Main exports
```

### Core Components

#### Historical Analysis (Existing)

- **CopilotParser**: Discovers and parses VS Code chat sessions
- **JSONExporter/MarkdownExporter**: Export chat data in various formats
- **SearchResult**: Search through chat content with context

#### 🤖 Automation Layer (New)

- **DockerCopilotAutomation**: Main orchestrator for automation sessions
- **VSCodeContainer**: Docker container lifecycle management
- **RealTimeCaptureParser**: Live capture of Copilot interactions
- **CodeGenerationScenario**: Pre-built and custom test scenarios
- **AutomationResultExporter**: Comprehensive result reporting

## Troubleshooting

### Docker Issues

```bash
# Check Docker installation
docker --version

# Test basic Docker functionality
docker run hello-world

# Check if Docker daemon is running
docker info

# Pull required base image manually
docker pull ubuntu:22.04
```

### Automation Issues

```bash
# Test environment setup
npx @codervisor/devlog-ai automation test-setup

# Check GitHub token
echo $GITHUB_TOKEN

# Run with debug logging
npx @codervisor/devlog-ai automation run --debug --token $GITHUB_TOKEN
```

### Common Problems

**"Docker not found"**

- Install Docker Desktop: https://docs.docker.com/get-docker/
- Ensure Docker daemon is running
- Add your user to docker group (Linux): `sudo usermod -aG docker $USER`

**"GitHub token invalid"**

- Generate personal access token: https://github.com/settings/tokens
- Ensure token has appropriate Copilot access permissions
- Set token as environment variable or use --token flag

**"Container startup timeout"**

- Increase timeout: `--timeout 120000`
- Check available system resources (RAM, disk space)
- Verify internet connection for downloading VS Code components

**"No scenarios found"**

- List available categories: `npx @codervisor/devlog-ai automation categories`
- Check scenario filters: `--category algorithms --language javascript`
- Create custom scenarios using the programmatic API

## Integration with Devlog

This package is part of the devlog monorepo ecosystem:

- **@codervisor/devlog-core**: Shared utilities and types
- **@codervisor/devlog-mcp**: MCP server integration for AI agents
- **@codervisor/devlog-web**: Web interface for visualization

## License

Apache 2.0 License - see LICENSE file for details.
