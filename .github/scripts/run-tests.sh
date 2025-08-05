#!/bin/bash
# Run tests for all packages
set -euo pipefail

echo "🧪 Running tests for all packages..."

# Run tests with coverage
pnpm test:coverage

echo "✅ All tests completed successfully"
