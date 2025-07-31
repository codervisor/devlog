#!/bin/bash
# Bump all packages to dev prerelease versions
set -euo pipefail

echo "🔄 Bumping packages to dev prerelease versions..."

# Define all publishable packages (as regular arrays for better compatibility)
PACKAGES=(
    "mcp:packages/mcp"
    "core:packages/core" 
    "ai:packages/ai"
    "cli:packages/cli"
)

# Generate timestamp for unique dev versions
TIMESTAMP=$(date +%Y%m%d%H%M%S)
SHORT_SHA=${GITHUB_SHA:0:7}
DEV_SUFFIX="dev.${TIMESTAMP}.${SHORT_SHA}"

for package_entry in "${PACKAGES[@]}"; do
    pkg_key="${package_entry%%:*}"
    pkg_dir="${package_entry##*:}"
    
    if [ -f "$pkg_dir/package.json" ]; then
        PKG_NAME=$(jq -r '.name' "$pkg_dir/package.json")
        CURRENT_VERSION=$(jq -r '.version' "$pkg_dir/package.json")
        
        echo "Processing $PKG_NAME@$CURRENT_VERSION..."
        
        # Parse current version to determine next prerelease version
        # If current version is already a prerelease, increment it
        # If it's a stable version, create a new prerelease based on it
        if [[ "$CURRENT_VERSION" == *"-"* ]]; then
            # Already a prerelease - extract base version
            BASE_VERSION=$(echo "$CURRENT_VERSION" | cut -d'-' -f1)
        else
            # Stable version - use as base
            BASE_VERSION="$CURRENT_VERSION"
        fi
        
        NEW_VERSION="${BASE_VERSION}-${DEV_SUFFIX}"
        
        echo "  Bumping to: $NEW_VERSION"
        
        # Update package.json with new version
        jq ".version = \"$NEW_VERSION\"" "$pkg_dir/package.json" > "$pkg_dir/package.json.tmp"
        mv "$pkg_dir/package.json.tmp" "$pkg_dir/package.json"
        
        echo "  ✅ Updated $PKG_NAME to v$NEW_VERSION"
    else
        echo "  ⚠️  Package.json not found for $pkg_key"
    fi
done

echo "🎉 All packages updated to dev versions with suffix: $DEV_SUFFIX"

# Output for GitHub Actions
echo "dev_suffix=$DEV_SUFFIX" >> ${GITHUB_OUTPUT:-/dev/stdout}
