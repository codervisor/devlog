#!/bin/bash
# Build VSCode Automation Docker Image
set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
IMAGE_NAME="codervisor/devlog-vscode-automation"
DOCKERFILE="Dockerfile.vscode-automation"

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# Check if Docker is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        log "ERROR: Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log "ERROR: Docker daemon is not running"
        exit 1
    fi
}

# Build the Docker image
build_image() {
    local tag="${1:-latest}"
    
    log "Building VSCode automation Docker image..."
    log "Image: $IMAGE_NAME:$tag"
    log "Dockerfile: $DOCKERFILE"
    log "Context: $PROJECT_ROOT"
    
    # Ensure AI package is built first
    if [ ! -d "$PROJECT_ROOT/packages/ai/build" ]; then
        log "Building AI package first..."
        cd "$PROJECT_ROOT"
        pnpm --filter @codervisor/devlog-ai build
    fi
    
    # Build the Docker image
    docker build \
        -f "$PROJECT_ROOT/$DOCKERFILE" \
        -t "$IMAGE_NAME:$tag" \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg VCS_REF="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" \
        "$PROJECT_ROOT"
    
    if [ $? -eq 0 ]; then
        log "✅ Successfully built $IMAGE_NAME:$tag"
        
        # Show image info
        docker images "$IMAGE_NAME:$tag"
        
        # Show image size
        local size=$(docker images --format "table {{.Size}}" "$IMAGE_NAME:$tag" | tail -n 1)
        log "Image size: $size"
        
    else
        log "❌ Failed to build $IMAGE_NAME:$tag"
        exit 1
    fi
}

# Test the built image
test_image() {
    local tag="${1:-latest}"
    
    log "Testing $IMAGE_NAME:$tag..."
    
    # Run basic health check
    if docker run --rm "$IMAGE_NAME:$tag" test; then
        log "✅ Image test passed"
    else
        log "❌ Image test failed"
        return 1
    fi
}

# Push image to registry
push_image() {
    local tag="${1:-latest}"
    local registry="${2:-}"
    
    if [ -n "$registry" ]; then
        local full_name="$registry/$IMAGE_NAME:$tag"
        
        log "Tagging image for registry: $full_name"
        docker tag "$IMAGE_NAME:$tag" "$full_name"
        
        log "Pushing to registry: $full_name"
        docker push "$full_name"
        
        if [ $? -eq 0 ]; then
            log "✅ Successfully pushed $full_name"
        else
            log "❌ Failed to push $full_name"
            exit 1
        fi
    else
        log "No registry specified, skipping push"
    fi
}

# Main function
main() {
    local command="${1:-build}"
    local tag="${2:-latest}"
    local registry="${3:-}"
    
    check_docker
    
    case "$command" in
        build)
            build_image "$tag"
            ;;
        test)
            test_image "$tag"
            ;;
        push)
            push_image "$tag" "$registry"
            ;;
        all)
            build_image "$tag"
            test_image "$tag"
            if [ -n "$registry" ]; then
                push_image "$tag" "$registry"
            fi
            ;;
        *)
            echo "Usage: $0 {build|test|push|all} [tag] [registry]"
            echo ""
            echo "Commands:"
            echo "  build    - Build the Docker image"
            echo "  test     - Test the built image"
            echo "  push     - Push image to registry"
            echo "  all      - Build, test, and optionally push"
            echo ""
            echo "Examples:"
            echo "  $0 build"
            echo "  $0 build v1.0.0"
            echo "  $0 push latest ghcr.io"
            echo "  $0 all latest ghcr.io"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
