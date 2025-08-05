#!/bin/bash
# Build all packages in dependency order
set -euo pipefail

echo "🔨 Building all packages..."

# Build all packages
pnpm build

echo "✅ All packages built successfully"
