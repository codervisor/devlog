#!/bin/bash
set -e

VERSION=${VERSION:-1.0.0}
BUILD_DIR="bin"
BINARY_NAME="devlog-collector"

echo "Building Devlog Collector v${VERSION}"
echo "======================================"

# Create build directory
mkdir -p ${BUILD_DIR}

# Build for all platforms
echo "Building for macOS (Intel)..."
GOOS=darwin GOARCH=amd64 go build -ldflags "-X main.version=${VERSION} -s -w" \
  -o ${BUILD_DIR}/${BINARY_NAME}-darwin-amd64 ./cmd/collector

echo "Building for macOS (Apple Silicon)..."
GOOS=darwin GOARCH=arm64 go build -ldflags "-X main.version=${VERSION} -s -w" \
  -o ${BUILD_DIR}/${BINARY_NAME}-darwin-arm64 ./cmd/collector

echo "Building for Linux (amd64)..."
GOOS=linux GOARCH=amd64 go build -ldflags "-X main.version=${VERSION} -s -w" \
  -o ${BUILD_DIR}/${BINARY_NAME}-linux-amd64 ./cmd/collector

echo "Building for Linux (arm64)..."
GOOS=linux GOARCH=arm64 go build -ldflags "-X main.version=${VERSION} -s -w" \
  -o ${BUILD_DIR}/${BINARY_NAME}-linux-arm64 ./cmd/collector

echo "Building for Windows (amd64)..."
GOOS=windows GOARCH=amd64 go build -ldflags "-X main.version=${VERSION} -s -w" \
  -o ${BUILD_DIR}/${BINARY_NAME}-windows-amd64.exe ./cmd/collector

echo ""
echo "Build complete! Binaries in ${BUILD_DIR}/"
ls -lh ${BUILD_DIR}/

# Calculate and display sizes
echo ""
echo "Binary sizes:"
du -h ${BUILD_DIR}/* | sort -h
