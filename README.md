# Devlog

A lightweight Rust daemon that collects AI coding agent events and sends them to configurable remote endpoints.

## Features

- 🔍 **Auto-discovery** - Automatically finds AI agent log locations
- 🔄 **Real-time monitoring** - Watches log files for changes with notify
- 📦 **Offline buffering** - SQLite buffer for offline operation and retry
- 🚀 **Single binary** - No runtime dependencies, ~10MB static binary
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
# Process all Copilot logs in a directory
./bin/devlog backfill run --agent copilot --path ~/.config/github-copilot/chat_sessions

# Check backfill status
./bin/devlog backfill status --agent copilot
```

## Architecture

```
devlog/
├── rust/             # Rust implementation
│   ├── devlog-cli/       # CLI entry point (clap)
│   ├── devlog-adapters/  # Agent-specific log parsers
│   ├── devlog-backfill/  # Historical log processing
│   ├── devlog-buffer/    # SQLite offline event buffer
│   ├── devlog-core/      # Shared types and config
│   ├── devlog-hierarchy/ # Workspace/project resolution
│   └── devlog-watcher/   # File system watching with notify
├── cmd/devlog/       # Legacy Go CLI (deprecated)
├── internal/         # Legacy Go internal packages (deprecated)
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
  "backfill": {
    "dbPath": "~/.devlog/backfill.db"
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

- Rust 1.75+
- Make

### Commands

```bash
make build         # Build for current platform
make test          # Run tests
make fmt           # Format code
make lint          # Run clippy
make install       # Install to /usr/local/bin
```

### Project Structure (Rust)

| Directory | Description |
|-----------|-------------|
| `rust/devlog-cli` | CLI application entry point |
| `rust/devlog-adapters` | Agent-specific log parsers |
| `rust/devlog-backfill` | Historical log import |
| `rust/devlog-buffer` | SQLite event buffer |
| `rust/devlog-core` | Shared types and constants |
| `rust/devlog-hierarchy` | Workspace/project context |
| `rust/devlog-watcher` | File system watcher |

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
