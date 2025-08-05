# @codervisor/devlog-cli

Command-line interface for devlog - Extract and stream chat history to devlog server.

## Installation

```bash
pnpm install -g @codervisor/devlog-cli
```

## Usage

### Chat History Management

```bash
# Stream chat history to devlog server
devlog chat import --server http://localhost:3200 --workspace myproject

# Get chat statistics
devlog chat stats --server http://localhost:3200 --workspace myproject

# Search chat content
devlog chat search "error handling" --server http://localhost:3200 --workspace myproject
```

### Automation (Docker-based testing)

```bash
# Run automation scenarios
devlog-automation run --token $GITHUB_TOKEN

# List available scenarios
devlog-automation scenarios

# Test Docker setup
devlog-automation test-setup --token $GITHUB_TOKEN
```

## Configuration

The CLI can be configured via:

- Command line options
- Environment variables
- Configuration file (`~/.devlog/config.json`)

### Environment Variables

- `DEVLOG_SERVER` - Default server URL
- `DEVLOG_WORKSPACE` - Default workspace ID
- `GITHUB_TOKEN` - GitHub token for automation features

## Development

```bash
# Build the CLI
pnpm build

# Watch mode
pnpm dev

# Run tests
pnpm test
```
