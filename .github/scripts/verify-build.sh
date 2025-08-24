#!/bin/bash
# Verify all build artifacts exist
set -euo pipefail

echo "🔍 Verifying build artifacts..."

FAILED=0

# Check core package
if [ -f "packages/core/build/index.js" ] && [ -f "packages/core/build/index.d.ts" ]; then
    echo "✅ Core package build artifacts verified"
else
    echo "❌ Core package build artifacts missing"
    FAILED=1
fi

# Check ai package
if [ -f "packages/ai/build/index.js" ] && [ -f "packages/ai/build/index.d.ts" ]; then
    echo "✅ AI package build artifacts verified"
else
    echo "❌ AI package build artifacts missing"
    FAILED=1
fi

# Check mcp package
if [ -f "packages/mcp/build/index.js" ] && [ -f "packages/mcp/build/index.d.ts" ]; then
    echo "✅ MCP package build artifacts verified"
else
    echo "❌ MCP package build artifacts missing"
    FAILED=1
fi

# Check cli package
if [ -f "packages/cli/build/index.js" ] && [ -f "packages/cli/build/index.d.ts" ]; then
    echo "✅ CLI package build artifacts verified"
else
    echo "❌ CLI package build artifacts missing"
    FAILED=1
fi

# Check web package
if [ -d "apps/web/.next" ]; then
    echo "✅ Web package build artifacts verified"
else
    echo "❌ Web package build artifacts missing"
    FAILED=1
fi

if [ $FAILED -eq 0 ]; then
    echo "✅ All build artifacts verified successfully!"
    exit 0
else
    echo "❌ Some build artifacts are missing"
    exit 1
fi
