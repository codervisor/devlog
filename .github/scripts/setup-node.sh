#!/bin/bash
# Setup Node.js, pnpm, and dependencies with caching
set -euo pipefail

# pnpm store path is already set by pnpm/action-setup
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo "✅ Node.js and dependencies setup complete"
