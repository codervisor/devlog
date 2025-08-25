#!/bin/bash
# Publish packages to NPM with dev tag
set -euo pipefail

echo "📦 Publishing packages to NPM with dev tag..."

# Define all publishable packages (as regular arrays for better compatibility)
PACKAGES=(
    "core:packages/core"
    "mcp:packages/mcp"
    "ai:packages/ai"
)

PUBLISHED_PACKAGES=""
FAILED_PACKAGES=""

for package_entry in "${PACKAGES[@]}"; do
    pkg_key="${package_entry%%:*}"
    pkg_dir="${package_entry##*:}"
    
    if [ -f "$pkg_dir/package.json" ]; then
        PKG_NAME=$(jq -r '.name' "$pkg_dir/package.json")
        PKG_VERSION=$(jq -r '.version' "$pkg_dir/package.json")
        
        echo "📤 Publishing $PKG_NAME@$PKG_VERSION with dev tag..."
        
        cd "$pkg_dir"
        
        # Publish with dev tag
        if pnpm publish --access public --no-git-checks --tag dev; then
            echo "  ✅ Successfully published $PKG_NAME@$PKG_VERSION"
            PUBLISHED_PACKAGES="$PUBLISHED_PACKAGES$PKG_NAME@$PKG_VERSION "
        else
            echo "  ❌ Failed to publish $PKG_NAME@$PKG_VERSION"
            FAILED_PACKAGES="$FAILED_PACKAGES$PKG_NAME@$PKG_VERSION "
        fi
        
        cd - > /dev/null
    else
        echo "  ⚠️  Package.json not found for $pkg_key"
        FAILED_PACKAGES="$FAILED_PACKAGES$pkg_key "
    fi
done

# Output for GitHub Actions
echo "published_packages=$PUBLISHED_PACKAGES" >> ${GITHUB_OUTPUT:-/dev/stdout}

if [ -n "$FAILED_PACKAGES" ]; then
    echo "failed_packages=$FAILED_PACKAGES" >> ${GITHUB_OUTPUT:-/dev/stdout}
    echo "❌ Some packages failed to publish: $FAILED_PACKAGES"
    exit 1
else
    echo "✅ All packages published successfully: $PUBLISHED_PACKAGES"
fi
