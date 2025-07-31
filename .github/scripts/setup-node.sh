#!/bin/bash
# Setup Node.js, pnpm, and dependencies with caching
set -euo pipefail

NODE_VERSION=${1:-"20"}
PNPM_VERSION=${2:-"10.13.1"}

echo "🔧 Setting up Node.js $NODE_VERSION and pnpm $PNPM_VERSION..."

# pnpm store path is already set by pnpm/action-setup
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo "✅ Node.js and dependencies setup complete"
