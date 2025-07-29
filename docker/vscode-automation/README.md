# VSCode Automation Docker Environment

This directory contains the Docker configuration and supporting files for the VSCode automation environment, designed to test GitHub Copilot and AI agent interactions in a controlled containerized environment.

## 🏗️ Architecture

The VSCode automation environment consists of:

- **Ubuntu 22.04 base** with GUI support via Xvfb
- **VS Code Insiders** with GitHub Copilot extensions
- **Code-server** for web-based access
- **VNC server** for remote desktop access
- **Test scenarios** for different programming languages
- **Automation framework** from `@codervisor/devlog-ai`

## 🚀 Quick Start

### Using GitHub Actions (Recommended)

The easiest way to run VSCode automation tests is through the GitHub Actions workflow:

1. **Automatic triggers**: Runs on changes to AI package or automation files
2. **Manual trigger**: Use the "VSCode Automation Pipeline" workflow with custom parameters
3. **Results**: Available as artifacts with detailed summaries

### Local Development

Build and run the Docker container locally:

```bash
# Build the image
./.github/scripts/build-vscode-automation.sh build

# Run in interactive mode
docker run -it --rm \
  -p 8080:8080 \
  -p 5900:5900 \
  -e GITHUB_TOKEN="your-token-here" \
  -e AUTOMATION_MODE=interactive \
  codervisor/devlog-vscode-automation:latest

# Run automated tests
docker run --rm \
  -v "$(pwd)/results:/logs" \
  -e GITHUB_TOKEN="your-token-here" \
  -e AUTOMATION_MODE=automated \
  codervisor/devlog-vscode-automation:latest test
```

### Access Methods

- **Web Interface**: http://localhost:8080 (code-server)
- **VNC**: localhost:5900 (remote desktop)
- **Logs**: Available in `/logs` directory within container

## 📁 Directory Structure

```
docker/vscode-automation/
├── scripts/
│   └── entrypoint.sh          # Container startup script
├── config/
│   └── automation-config.json # Test configuration
├── test-files/
│   ├── algorithms.py          # Python test scenarios
│   ├── api.js                 # JavaScript/Node.js tests
│   └── utils.ts               # TypeScript tests
└── supervisord.conf           # Process management
```

## 🧪 Test Scenarios

### Python Algorithms (`python-algorithms`)
- Binary search implementation
- Quicksort algorithm
- Fibonacci sequence
- Tree traversal functions

### JavaScript API (`javascript-api`)
- Express.js REST endpoints
- CRUD operations
- Error handling middleware
- Route parameter validation

### TypeScript Utilities (`typescript-utils`)
- Type-safe utility functions
- Generic API wrappers
- Data validation and filtering
- Async operation handling

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GITHUB_TOKEN` | - | Required for Copilot authentication |
| `AUTOMATION_MODE` | `interactive` | Mode: `interactive`, `automated`, `test` |
| `LOG_LEVEL` | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `TEST_SCENARIO` | all | Specific scenario to run |
| `CODE_SERVER_PORT` | `8080` | Code-server web interface port |
| `VNC_PORT` | `5900` | VNC server port |
| `DISPLAY` | `:99` | X11 display for GUI applications |
| `TIMEOUT` | `1800` | Test timeout in seconds |

### GitHub Actions Inputs

The workflow supports these inputs:

- **automation_mode**: Test execution mode
- **test_scenarios**: Comma-separated list of scenarios to run
- **log_level**: Logging verbosity level

## 📊 Results and Metrics

### Automation Results

Tests generate comprehensive results in JSON format:

```json
{
  "sessionId": "automation-session-123",
  "startTime": "2025-07-29T16:30:00Z",
  "endTime": "2025-07-29T16:45:00Z",
  "scenarios": [...],
  "summary": {
    "totalScenarios": 3,
    "successfulScenarios": 2,
    "failedScenarios": 1,
    "totalInteractions": 45,
    "overallSuccessRate": 67
  }
}
```

### Key Metrics

- **Success Rate**: Percentage of successful Copilot interactions
- **Response Time**: Average time for Copilot suggestions
- **Acceptance Rate**: How often suggestions are accepted
- **Interaction Count**: Total number of Copilot triggers

## 🔧 Development

### Adding New Test Scenarios

1. Create test files in `test-files/`
2. Update `automation-config.json`
3. Add scenario logic to the AI automation framework
4. Update workflow matrix if needed

### Customizing the Environment

- **VS Code Extensions**: Modify Dockerfile extension installation
- **System Dependencies**: Add packages to Ubuntu base
- **Test Workspace**: Customize workspace setup in entrypoint script

### Debugging

```bash
# Run container with shell access
docker run -it --rm \
  -e AUTOMATION_MODE=shell \
  codervisor/devlog-vscode-automation:latest shell

# View container logs
docker logs automation-container-name

# Access VNC for visual debugging
# Connect to localhost:5900 with VNC viewer
```

## 📋 Troubleshooting

### Common Issues

1. **Copilot not working**: Ensure `GITHUB_TOKEN` has Copilot access
2. **Container startup fails**: Check Docker resources and ports
3. **Tests timeout**: Increase `TIMEOUT` environment variable
4. **No GUI**: Verify Xvfb is running with `ps aux | grep Xvfb`

### Resource Requirements

- **CPU**: 2+ cores recommended
- **Memory**: 4GB+ for smooth operation  
- **Disk**: 2GB+ for container and workspace
- **Network**: Internet access for package downloads

## 🔒 Security Considerations

- Container runs as non-root user (`vscode`)
- GitHub token is only used for Copilot authentication
- No persistent data storage by default
- Network isolated unless explicitly exposed

## 📚 Integration

### CI/CD Pipeline

The automation is integrated into the project's CI/CD through:

- **Path-based triggers**: Only runs on relevant code changes
- **Matrix strategy**: Parallel execution of different scenarios
- **Artifact storage**: Results preserved for analysis
- **Security scanning**: Container vulnerability assessment

### Local Development Workflow

```bash
# 1. Build AI package (required dependency)
pnpm --filter @codervisor/devlog-ai build

# 2. Build automation container
./.github/scripts/build-vscode-automation.sh build

# 3. Run specific test scenario
docker run --rm \
  -v "$(pwd)/results:/logs" \
  -e TEST_SCENARIO=python-algorithms \
  -e GITHUB_TOKEN="$GITHUB_TOKEN" \
  codervisor/devlog-vscode-automation:latest test

# 4. Analyze results
cat results/automation-results.json | jq '.summary'
```

## 🤝 Contributing

When contributing to the automation system:

1. **Test locally** before submitting PRs
2. **Update documentation** for new features
3. **Follow TypeScript standards** for automation code
4. **Add appropriate test scenarios** for new functionality
5. **Consider resource impact** of changes

---

For more details, see the main project documentation and the AI package README.
