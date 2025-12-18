# Contributing to Devlog

A Rust-based AI agent event collector. This document explains the project structure and development workflow.

## Project Structure

```
devlog/
├── rust/
│   ├── devlog-cli/       # CLI entry point (clap)
│   ├── devlog-adapters/  # Agent-specific log parsers
│   ├── devlog-backfill/  # Historical log processing
│   ├── devlog-buffer/    # SQLite offline event buffer
│   ├── devlog-core/      # Shared types and config
│   ├── devlog-hierarchy/ # Workspace/project resolution
│   └── devlog-watcher/   # File system watching with notify
├── cmd/                  # Legacy Go CLI (deprecated)
├── internal/             # Legacy Go internal packages (deprecated)
├── configs/              # Default configuration files
├── docs/                 # Documentation
└── specs/                # Feature specifications
```

## Development Workflow

### Prerequisites

- Rust 1.75+
- Make

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/codervisor/devlog.git
cd devlog

# Build the binary
make build
```

### Build Commands

```bash
make build         # Build for current platform
make clean         # Remove build artifacts
make install       # Install to /usr/local/bin
```

### Development

```bash
make run           # Build and run
make fmt           # Format code
make lint          # Run clippy
```

### Testing

```bash
make test          # Run all tests
```

## Adding a New Agent Adapter

To add support for a new AI coding agent:

1. Create a new file in `rust/devlog-adapters/src/` (e.g., `myagent.rs`)
2. Implement the `AgentAdapter` trait:

```rust
#[async_trait]
pub trait AgentAdapter: Send + Sync {
    fn name(&self) -> &str;
    fn parse_log_line(&self, line: &str) -> Result<Option<AgentEvent>>;
    async fn parse_log_file(&self, file_path: &Path) -> Result<Vec<AgentEvent>>;
    fn supports_format(&self, sample: &str) -> bool;
}
```

3. Register in `rust/devlog-adapters/src/lib.rs` and `rust/devlog-cli/src/main.rs`
4. Add tests in `rust/devlog-adapters/src/myagent.rs`

## Code Style

- Follow standard Rust conventions
- Use `make fmt` before committing
- Use `make lint` to check for issues
- Add tests for new functionality

## Architecture Decisions

### Why Rust?

- Memory safety without garbage collection
- Zero-cost abstractions
- Excellent performance for parsing and I/O
- Strong type system with Result/Option
- Single static binary

### Design Principles

- **Simplicity**: Occam's razor - simple solutions over complex ones
- **Type safety**: Strong typing throughout
- **Testability**: All components are testable in isolation
- **Extensibility**: Easy to add new agent adapters

## Pull Request Guidelines

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `make test` and `make lint`
5. Submit a PR with a clear description

## License

Apache 2.0 - see [LICENSE](LICENSE)
