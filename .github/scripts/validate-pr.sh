#!/bin/bash
# Quick validation for PR checks
set -euo pipefail

echo "🔍 Running PR validation checks..."

# Type check all packages
echo "📝 Type-checking packages..."
pnpm -r exec tsc --noEmit --skipLibCheck

# Quick build test (core packages only for speed)
echo "🔨 Quick build test..."
pnpm --filter @codervisor/devlog-core build
pnpm --filter @codervisor/devlog-ai build
pnpm --filter @codervisor/devlog-mcp build

# Run tests
echo "🧪 Running tests..."
pnpm -r test

# Validate import structure if script exists
echo "📦 Validating import structure..."
if [ -f "scripts/validate-imports.js" ]; then
    node scripts/validate-imports.js
else
    echo "⚠️  Import validation script not found, skipping"
fi

echo "✅ All PR validation checks passed!"
