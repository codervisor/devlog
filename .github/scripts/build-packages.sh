#!/bin/bash
# Build all packages in dependency order
set -euo pipefail

echo "🔨 Building packages in dependency order..."

# Build core package first (no dependencies)
echo "Building @codervisor/devlog-core..."
pnpm --filter @codervisor/devlog-core build

# Build ai package (depends on core)
echo "Building @codervisor/devlog-ai..."
pnpm --filter @codervisor/devlog-ai build

# Build mcp package (depends on core)
echo "Building @codervisor/devlog-mcp..."
pnpm --filter @codervisor/devlog-mcp build

# Build web package (depends on core)
echo "Building @codervisor/devlog-web..."
pnpm --filter @codervisor/devlog-web build

echo "✅ All packages built successfully"
