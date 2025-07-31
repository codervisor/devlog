#!/bin/bash

# Docker Automation Test Script
# Tests the Docker-based Copilot automation setup

set -e

echo "🚀 Testing Docker-based Copilot Automation Setup"
echo "================================================"

# Check if GITHUB_TOKEN is set
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ GITHUB_TOKEN environment variable not set"
    echo "   Set your GitHub token: export GITHUB_TOKEN=your_token_here"
    exit 1
fi

echo "✅ GitHub token found"

# Check Docker installation
echo -n "🐳 Checking Docker installation... "
if command -v docker >/dev/null 2>&1; then
    echo "✅ Docker found"
else
    echo "❌ Docker not found"
    echo "   Install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker daemon is running
echo -n "🔄 Checking Docker daemon... "
if docker info >/dev/null 2>&1; then
    echo "✅ Docker daemon running"
else
    echo "❌ Docker daemon not running"
    echo "   Start Docker Desktop or dockerd service"
    exit 1
fi

# Test Docker functionality
echo -n "🧪 Testing Docker functionality... "
if docker run --rm hello-world >/dev/null 2>&1; then
    echo "✅ Docker working"
else
    echo "❌ Docker test failed"
    exit 1
fi

# Check available resources
echo -n "💾 Checking system resources... "
AVAILABLE_RAM=$(free -m | awk 'NR==2{printf "%.0f", $7/1024}')
if [ "$AVAILABLE_RAM" -gt 2 ]; then
    echo "✅ ${AVAILABLE_RAM}GB RAM available"
else
    echo "⚠️  Low RAM: ${AVAILABLE_RAM}GB (recommend 2GB+)"
fi

# Test AI automation package
echo -n "📦 Testing @codervisor/devlog-ai package... "
if npx @codervisor/devlog-ai automation test-setup >/dev/null 2>&1; then
    echo "✅ Package test passed"
else
    echo "❌ Package test failed"
    echo "   Run: pnpm --filter @codervisor/devlog-ai build"
    exit 1
fi

# Pull base Docker image
echo -n "📥 Pulling Ubuntu base image... "
if docker pull ubuntu:22.04 >/dev/null 2>&1; then
    echo "✅ Base image ready"
else
    echo "❌ Failed to pull base image"
    echo "   Check internet connection"
    exit 1
fi

echo ""
echo "🎉 Docker automation environment ready!"
echo ""
echo "Next steps:"
echo "  1. List available scenarios:"
echo "     npx @codervisor/devlog-ai automation scenarios"
echo ""
echo "  2. Run a quick test:"
echo "     npx @codervisor/devlog-ai automation run --scenarios algorithms --count 2"
echo ""
echo "  3. Run comprehensive testing:"
echo "     npx @codervisor/devlog-ai automation run --scenarios algorithms,api,testing --language javascript"
echo ""
echo "  4. Custom automation (programmatic):"
echo "     node examples/automation-examples.js"
echo ""
