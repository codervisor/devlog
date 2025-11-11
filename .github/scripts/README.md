# GitHub Actions Scripts

This directory contains reusable shell scripts to optimize and simplify GitHub Actions workflows.

## 🎯 Benefits

- **DRY Principle**: Eliminates code duplication across workflows
- **Maintainability**: Changes to logic only need to be made in one place
- **Testability**: Scripts can be tested locally
- **Readability**: Workflows are cleaner and easier to understand
- **Reusability**: Scripts can be used in multiple workflows or locally

## 📁 Scripts Overview

### Core Build & Test Scripts

#### `setup-node.sh`

Sets up Node.js environment and installs dependencies with pnpm.

```bash
./.github/scripts/setup-node.sh [node_version] [pnpm_version]
```

- **Default**: Node.js 20, pnpm 10.15.0
- **Used in**: All workflows that need Node.js

#### `build-packages.sh`

Builds all packages in dependency order (core → ai → mcp → web).

```bash
./.github/scripts/build-packages.sh
```

- **Dependencies**: Requires pnpm workspace setup
- **Output**: Build artifacts in `packages/*/build` and `packages/web/.next-build`

#### `verify-build.sh`

Verifies that all expected build artifacts exist.

```bash
./.github/scripts/verify-build.sh
```

- **Checks**:
  - Core, AI, MCP, CLI packages: `build/index.js` and `build/index.d.ts`
  - Web package: `.next-build/` directory
- **Exit codes**: 0 = success, 1 = missing artifacts

#### `run-tests.sh`

Runs tests for all packages with coverage.

```bash
./.github/scripts/run-tests.sh
```

- **Command**: `pnpm -r test:coverage`
- **Requirements**: All packages must have `test:coverage` script

### NPM Publishing Scripts

#### `check-versions.sh`

Determines which packages need to be published based on version comparison.

```bash
./.github/scripts/check-versions.sh [force_publish] [package_filter]
```

- **Parameters**:
  - `force_publish`: "true" to force publish regardless of versions
  - `package_filter`: Comma-separated list (e.g., "core,mcp")
- **Output**: Sets GitHub Actions outputs for downstream jobs
- **Environment**: Requires `NODE_AUTH_TOKEN` for NPM registry access

#### `publish-packages.sh`

Publishes specified packages to NPM registry.

```bash
./.github/scripts/publish-packages.sh "mcp,core,ai"
```

- **Input**: Comma-separated package list
- **Environment**: Requires `NODE_AUTH_TOKEN`
- **Output**: Sets `published_packages` GitHub Actions output

### Docker & Validation Scripts

#### `test-docker.sh`

Tests Docker image functionality by starting container and checking endpoints.

```bash
./.github/scripts/test-docker.sh "image:tag"
```

- **Tests**:
  - Container starts successfully
  - HTTP endpoint responds (port 3000)
  - Health check endpoint (if available)
- **Cleanup**: Automatically stops test container

#### `validate-pr.sh`

Runs lightweight validation checks for pull requests.

```bash
./.github/scripts/validate-pr.sh
```

- **Checks**:
  - TypeScript compilation
  - Quick build test (core, ai, mcp packages)
  - Unit tests
  - Import structure validation (if script exists)

## 🔧 Usage in Workflows

### Before (Workflow with inline scripts)

```yaml
- name: Build packages
  run: |
    pnpm --filter @codervisor/devlog-core build
    pnpm --filter @codervisor/devlog-ai build
    pnpm --filter @codervisor/devlog-mcp build
    pnpm --filter @codervisor/devlog-web build
```

### After (Workflow with script)

```yaml
- name: Build packages
  run: ./.github/scripts/build-packages.sh
```

## 🧪 Local Testing

All scripts can be tested locally:

```bash
# Test build process
./.github/scripts/setup-node.sh
./.github/scripts/build-packages.sh
./.github/scripts/verify-build.sh

# Test PR validation
./.github/scripts/validate-pr.sh

# Test version checking (dry run)
./.github/scripts/check-versions.sh "false" ""
```

## 🔍 Script Standards

### Error Handling

- All scripts use `set -euo pipefail` for strict error handling
- Exit codes: 0 = success, 1 = failure
- Clear error messages with emojis for visibility

### GitHub Actions Integration

- Scripts write to `$GITHUB_OUTPUT` when available
- Fallback to stdout for local testing
- Support both CI and local environments

### Logging

- Consistent emoji prefixes for different operations:
  - 🔧 Setup/configuration
  - 🔨 Building
  - 🧪 Testing
  - 📦 Packaging/publishing
  - 🐳 Docker operations
  - ✅ Success
  - ❌ Failure
  - ⚠️ Warning

### Parameters

- Support both required and optional parameters
- Provide sensible defaults
- Document parameter usage in script comments

## 📊 Performance Impact

### Before Refactoring

- **Duplicated logic**: ~150 lines across 3 workflows
- **Maintenance**: Changes needed in multiple files
- **Testing**: Difficult to test workflow logic locally

### After Refactoring

- **Centralized logic**: ~50 lines per workflow (70% reduction)
- **Maintenance**: Changes in single script files
- **Testing**: Scripts testable locally and in CI

## 🚀 Future Enhancements

Potential improvements:

- **Script parameters**: More configurable options
- **Parallel execution**: Where safe and beneficial
- **Advanced caching**: More granular cache strategies
- **Integration testing**: End-to-end workflow testing
- **Monitoring**: Script execution metrics
