# Devlog

A lightweight Go daemon that collects AI coding agent events and sends them to configurable remote endpoints.

## Features

- 🔍 **Auto-discovery** - Automatically finds AI agent log locations
- 🔄 **Real-time monitoring** - Watches log files for changes with fsnotify
- 📦 **Offline buffering** - SQLite buffer for offline operation and retry
- 🚀 **Single binary** - No runtime dependencies, ~15MB static binary
- 🌍 **Cross-platform** - macOS, Linux, Windows support
- 🔌 **Multi-agent** - GitHub Copilot, Claude Code, Cursor, and more

## Supported AI Agents

- ✅ GitHub Copilot
- ✅ Claude Code (Anthropic)
- ✅ Cursor
- 🔧 Generic JSONL adapter for custom agents

## Quick Start

### Build

```bash
# Build for current platform
make build

# Build for all platforms
make build-all

# Binary available at: bin/devlog
```

### Run

```bash
# Start the daemon
./bin/devlog start

# Check status
./bin/devlog status

# Show version
./bin/devlog version
```

### Backfill Historical Logs

```bash
# Process last 7 days of Copilot logs
./bin/devlog backfill run --agent copilot --days 7

# Backfill specific date range
./bin/devlog backfill run --agent copilot --from 2025-01-01 --to 2025-01-31

# Process all discovered workspaces
./bin/devlog backfill run --agent copilot --days 30 --all-workspaces

# Check backfill status
./bin/devlog backfill status --agent copilot
```

## Architecture

```
devlog/
├── cmd/devlog/       # CLI entry point (Cobra)
├── internal/
│   ├── adapters/     # Agent-specific log parsers (Copilot, Claude, Cursor)
│   ├── backfill/     # Historical log processing
│   ├── buffer/       # SQLite offline event buffer
│   ├── client/       # HTTP client for remote endpoints
│   ├── config/       # Configuration management
│   ├── hierarchy/    # Workspace/project resolution
│   └── watcher/      # File system watching with fsnotify
├── pkg/
│   ├── models/       # Data models
│   └── types/        # Event types and constants
└── configs/          # Default configuration files
```

### Event Flow

```
[Log Files] → [Watcher] → [Adapter/Parser] → [Events] → [Client] → [Remote]
                                                   ↓
                                              [Buffer] (offline fallback)
```

## Configuration

Create a configuration file at `~/.devlog/collector.json`:

```json
{
  "version": "1.0",
  "backendUrl": "http://localhost:8080",
  "apiKey": "${DEVLOG_API_KEY}",
  "projectId": "my-project",
  "collection": {
    "batchSize": 100,
    "batchInterval": "5s",
    "maxRetries": 3
  },
  "buffer": {
    "enabled": true,
    "maxSize": 10000,
    "dbPath": "~/.devlog/buffer.db"
  },
  "agents": {
    "copilot": { "enabled": true, "logPath": "auto" },
    "claude": { "enabled": true, "logPath": "auto" },
    "cursor": { "enabled": true, "logPath": "auto" }
  },
  "logging": {
    "level": "info"
  }
}
```

Environment variables in the format `${VAR_NAME}` are automatically expanded.

## Docker

```bash
# Build the image
docker build -t devlog .

# Run the collector
docker run -d \
  -v ~/.config/github-copilot:/home/devlog/.config/github-copilot:ro \
  -v ~/.cursor:/home/devlog/.cursor:ro \
  -e DEVLOG_BACKEND_URL=http://host.docker.internal:8080 \
  -e DEVLOG_API_KEY=your-api-key \
  devlog

# Or use docker-compose
docker compose up -d
```

## Development

### Prerequisites

- Go 1.24+
- Make

### Commands

```bash
make build         # Build for current platform
make build-all     # Build for all platforms (macOS, Linux, Windows)
make test          # Run tests with coverage
make test-coverage # Generate HTML coverage report
make lint          # Run golangci-lint
make fmt           # Format code
make dev           # Run with live reload (requires air)
make install       # Install to /usr/local/bin
```

### Project Structure

| Directory | Description |
|-----------|-------------|
| `cmd/devlog` | CLI application entry point |
| `internal/adapters` | Agent-specific log parsers |
| `internal/backfill` | Historical log import |
| `internal/buffer` | SQLite event buffer |
| `internal/client` | HTTP client with retry logic |
| `internal/config` | Configuration loading |
| `internal/hierarchy` | Workspace/project context |
| `internal/watcher` | File system watcher |
| `pkg/types` | Shared types and constants |

## Remote Integration

Devlog sends events to configurable HTTP endpoints. Events are POSTed as JSON:

```json
{
  "id": "evt_123",
  "eventType": "llm_request",
  "timestamp": "2025-01-15T10:30:00Z",
  "agentId": "github-copilot",
  "sessionId": "session_abc",
  "projectId": 1,
  "workspaceId": 42,
  "data": {
    "prompt": "...",
    "model": "gpt-4"
  },
  "metrics": {
    "tokenCount": 150,
    "promptTokens": 100,
    "responseTokens": 50
  }
}
```

### Supported Backends

- **agent-relay** - Native integration for session visualization
- **Custom backends** - Any HTTP endpoint accepting JSON events
- **stdout** - For piping to other tools (planned)

## License

Apache 2.0 License - see [LICENSE](LICENSE) file for details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.
