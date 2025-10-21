# Devlog Collector (Go)

A lightweight, cross-platform binary that monitors AI coding agent logs in real-time and forwards events to the Devlog backend.

## Features

- 🔍 **Auto-discovery** - Automatically finds agent log locations
- 🔄 **Real-time monitoring** - Watches log files for changes
- 📦 **Offline buffer** - SQLite buffer for offline operation
- 🚀 **High performance** - Written in Go for efficiency
- 🌍 **Cross-platform** - macOS, Linux, Windows support
- 🔌 **Multi-agent** - Supports Copilot, Claude, Cursor, and more

## Supported Agents

- GitHub Copilot
- Claude Code
- Cursor
- Generic adapter (fallback)

## Installation

### Via NPM (Recommended)

```bash
npm install -g @codervisor/devlog-collector
```

### Manual Installation

1. Download the binary for your platform from [releases](https://github.com/codervisor/devlog/releases)
2. Make it executable: `chmod +x devlog-collector-*`
3. Move to your PATH: `mv devlog-collector-* /usr/local/bin/devlog-collector`

## Quick Start

1. **Configure** (optional - auto-configuration works for most cases)

```bash
# Create config file
mkdir -p ~/.devlog
cat > ~/.devlog/collector.json << EOF
{
  "version": "1.0",
  "backendUrl": "https://api.devlog.io",
  "apiKey": "your-api-key",
  "projectId": "my-project"
}
EOF
```

2. **Start the collector**

```bash
devlog-collector start
```

3. **Check status**

```bash
devlog-collector status
```

## Configuration

The collector looks for configuration at `~/.devlog/collector.json`.

Example configuration:

```json
{
  "version": "1.0",
  "backendUrl": "https://api.devlog.io",
  "apiKey": "${DEVLOG_API_KEY}",
  "projectId": "my-project",
  
  "collection": {
    "batchSize": 100,
    "batchInterval": "5s",
    "maxRetries": 3,
    "retryBackoff": "exponential"
  },
  
  "buffer": {
    "enabled": true,
    "maxSize": 10000,
    "dbPath": "~/.devlog/buffer.db"
  },
  
  "agents": {
    "copilot": {
      "enabled": true,
      "logPath": "auto"
    },
    "claude": {
      "enabled": true,
      "logPath": "auto"
    },
    "cursor": {
      "enabled": true,
      "logPath": "auto"
    }
  },
  
  "logging": {
    "level": "info",
    "file": "~/.devlog/collector.log"
  }
}
```

### Environment Variables

You can use environment variables in the config file:

- `${DEVLOG_API_KEY}` - Your Devlog API key
- `${DEVLOG_PROJECT_ID}` - Project ID
- `${HOME}` - User home directory

## Development

### Prerequisites

- Go 1.21 or later
- Make

### Building

```bash
# Build for current platform
make build

# Build for all platforms
make build-all

# Run tests
make test

# Run with live reload
make dev
```

### Project Structure

```
packages/collector-go/
├── cmd/
│   └── collector/
│       └── main.go           # Entry point
├── internal/
│   ├── adapters/             # Agent-specific parsers
│   ├── buffer/               # SQLite offline storage
│   ├── config/               # Configuration management
│   ├── watcher/              # File system watching
│   └── client/               # Backend HTTP client
├── pkg/
│   └── types/                # Public types/interfaces
├── Makefile                  # Build automation
├── go.mod                    # Go module definition
└── README.md
```

### Adding a New Agent Adapter

1. Create a new file in `internal/adapters/`
2. Implement the `AgentAdapter` interface
3. Register the adapter in `internal/adapters/registry.go`
4. Add tests

See `internal/adapters/README.md` for detailed instructions.

## Performance

- **Binary size**: ~15MB
- **Memory usage**: ~30MB (typical)
- **CPU usage**: <1% (idle), ~2% (active)
- **Event processing**: ~5K events/sec

## Troubleshooting

### Collector won't start

1. Check if config file exists: `cat ~/.devlog/collector.json`
2. Verify API key is set
3. Check logs: `tail -f ~/.devlog/collector.log`

### Events not being collected

1. Verify agents are running and generating logs
2. Check log paths in config
3. Enable verbose logging: `devlog-collector start -v`

### High CPU/memory usage

1. Check buffer size in config
2. Reduce batch frequency
3. Check for log file issues (rotation, corruption)

## License

MIT

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md)
