# NPM Dev Versions

This document explains how to install and use development versions of the Devlog packages.

## Installing Dev Versions

Development versions are automatically published from the `develop` branch and are available under the `dev` tag:

```bash
# Install specific dev package
npm install @codervisor/devlog-core@dev
npm install @codervisor/devlog-mcp@dev
npm install @codervisor/devlog-ai@dev
npm install @codervisor/devlog-cli@dev

# Or with pnpm
pnpm add @codervisor/devlog-core@dev
pnpm add @codervisor/devlog-mcp@dev
pnpm add @codervisor/devlog-ai@dev
pnpm add @codervisor/devlog-cli@dev
```

## Dev Version Format

Dev versions follow the format: `{base-version}-dev.{timestamp}.{commit-sha}`

For example: `0.0.1-dev.20250130155816.abc1234`

- `0.0.1`: Base version from package.json
- `dev`: Development tag
- `20250130155816`: Timestamp (YYYYMMDDHHMMSS)
- `abc1234`: Short commit SHA (first 7 characters)

## Automatic Publishing

Dev versions are automatically published when:

1. **Push to develop branch**: Every push to `develop` triggers a dev release
2. **Manual workflow dispatch**: You can manually trigger dev publishing from GitHub Actions

## Checking Available Versions

```bash
# View all available versions and tags
npm view @codervisor/devlog-core versions --json

# View current dev version
npm view @codervisor/devlog-core@dev version

# View all dist-tags
npm view @codervisor/devlog-core dist-tags
```

## Production vs Development

- **Production**: `npm install @codervisor/devlog-core` (installs `latest` tag)
- **Development**: `npm install @codervisor/devlog-core@dev` (installs `dev` tag)

## CI/CD Workflow

The workflow includes two separate publishing jobs:

1. **npm-publish-stable**: Publishes to `latest` tag from `main` branch
2. **npm-publish-dev**: Publishes to `dev` tag from `develop` branch

Both jobs run independently and publish to different NPM tags, allowing users to choose between stable and development versions.
