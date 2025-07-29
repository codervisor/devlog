#!/bin/bash
# Test Docker image functionality
set -euo pipefail

IMAGE_TAG=${1:-""}

if [ -z "$IMAGE_TAG" ]; then
    echo "❌ No image tag provided"
    exit 1
fi

echo "🐳 Testing Docker image: $IMAGE_TAG"

# Run a quick test to ensure the image starts correctly
echo "🚀 Starting container..."
docker run --rm -d --name devlog-test -p 3000:3000 \
    -e NODE_ENV=production \
    -e DEVLOG_STORAGE_TYPE=json \
    "$IMAGE_TAG"

# Wait for the application to start
echo "⏳ Waiting for application to start..."
sleep 15

# Check if the application is responding
echo "🔍 Testing application response..."
if curl -f http://localhost:3000/ -I 2>/dev/null; then
    echo "✅ Application is responding"
else
    echo "❌ Application not responding"
    echo "📋 Container logs:"
    docker logs devlog-test
    docker stop devlog-test 2>/dev/null || true
    exit 1
fi

# Test health endpoint if available
echo "🏥 Testing health endpoint..."
if curl -f http://localhost:3000/api/health 2>/dev/null; then
    echo "✅ Health check passed"
else
    echo "⚠️  Health check endpoint not available, but application is running"
fi

# Cleanup
echo "🧹 Cleaning up..."
docker stop devlog-test

echo "✅ Docker image test completed successfully"
