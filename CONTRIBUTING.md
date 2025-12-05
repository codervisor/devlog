# Contributing to Devlog

A Go-based AI agent event collector. This document explains the project structure and development workflow.

## Project Structure

```
devlog/
├── cmd/
│   └── devlog/           # CLI entry point (Cobra)
├── internal/
│   ├── adapters/         # Agent-specific log parsers
│   ├── backfill/         # Historical log processing
│   ├── buffer/           # SQLite offline event buffer
│   ├── client/           # HTTP client for remote endpoints
│   ├── config/           # Configuration management
│   ├── hierarchy/        # Workspace/project resolution
│   ├── integration/      # Integration tests
│   └── watcher/          # File system watching
├── pkg/
│   ├── models/           # Data models
│   └── types/            # Event types and constants
├── configs/              # Default configuration files
├── docs/                 # Documentation
└── specs/                # Feature specifications
```

## Development Workflow

### Prerequisites

- Go 1.24+
- Make

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/codervisor/devlog.git
cd devlog

# Download dependencies
make deps

# Build the binary
make build
```

### Build Commands

```bash
make build         # Build for current platform
make build-all     # Build for macOS, Linux, Windows (all architectures)
make clean         # Remove build artifacts
make install       # Install to /usr/local/bin
```

### Development

```bash
make dev           # Run with live reload (requires air)
make run           # Build and run
make fmt           # Format code
make lint          # Run golangci-lint
```

### Testing

```bash
make test          # Run all tests with race detection
make test-coverage # Generate HTML coverage report
```

## Adding a New Agent Adapter

To add support for a new AI coding agent:

1. Create a new file in `internal/adapters/` (e.g., `myagent_adapter.go`)
2. Implement the `AgentAdapter` interface:

```go
type AgentAdapter interface {
    Name() string
    ParseLogLine(line string) (*types.AgentEvent, error)
    ParseLogFile(filePath string) ([]*types.AgentEvent, error)
    SupportsFormat(sample string) bool
}
```

3. Register in `internal/adapters/registry.go`
4. Add log discovery paths in `internal/watcher/discovery.go`
5. Add tests in `internal/adapters/myagent_adapter_test.go`

## Code Style

- Follow standard Go conventions
- Use `make fmt` before committing
- Use `make lint` to check for issues
- Add tests for new functionality
- Keep functions focused and well-documented

## Architecture Decisions

### Why Go?

- Single static binary - no runtime dependencies
- Low memory footprint for always-on daemon
- Excellent file watching and concurrent I/O
- Cross-platform support (macOS, Linux, Windows)

### Design Principles

- **Simplicity**: Occam's razor - simple solutions over complex ones
- **Type safety**: Strong typing throughout
- **Testability**: All components are testable in isolation
- **Extensibility**: Easy to add new agent adapters

## Pull Request Guidelines

1. Fork the repository
2. Create a feature branch from `develop`
3. Make your changes with tests
4. Run `make test` and `make lint`
5. Submit a PR with a clear description

## License

Apache 2.0 - see [LICENSE](LICENSE)
