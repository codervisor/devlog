#!/bin/bash
# Check package versions and determine what needs to be published
set -euo pipefail

FORCE_PUBLISH=${1:-"false"}
SPECIFIED_PACKAGES=${2:-""}

echo "🔍 Checking package versions for NPM publishing..."

PACKAGES_TO_PUBLISH=""

# Define all publishable packages
declare -A PACKAGE_MAP=(
    ["mcp"]="packages/mcp"
    ["core"]="packages/core" 
    ["ai"]="packages/ai"
    ["cli"]="packages/cli"
)

# If specific packages specified, filter to those
if [ -n "$SPECIFIED_PACKAGES" ]; then
    echo "📦 Filtering to specified packages: $SPECIFIED_PACKAGES"
    IFS=',' read -ra SPECIFIED_ARRAY <<< "$SPECIFIED_PACKAGES"
    declare -A FILTERED_MAP
    for pkg in "${SPECIFIED_ARRAY[@]}"; do
        pkg=$(echo "$pkg" | xargs) # trim whitespace
        if [[ -n "${PACKAGE_MAP[$pkg]:-}" ]]; then
            FILTERED_MAP[$pkg]="${PACKAGE_MAP[$pkg]}"
        fi
    done
    # Replace PACKAGE_MAP with filtered version
    PACKAGE_MAP=()
    for key in "${!FILTERED_MAP[@]}"; do
        PACKAGE_MAP[$key]="${FILTERED_MAP[$key]}"
    done
fi

for pkg_key in "${!PACKAGE_MAP[@]}"; do
    pkg_dir="${PACKAGE_MAP[$pkg_key]}"
    
    if [ -f "$pkg_dir/package.json" ]; then
        PKG_NAME=$(jq -r '.name' "$pkg_dir/package.json")
        LOCAL_VERSION=$(jq -r '.version' "$pkg_dir/package.json")
        
        echo "Checking $PKG_NAME@$LOCAL_VERSION..."
        
        # Check if package exists on npm and get published version
        NPM_VERSION=$(npm view "$PKG_NAME" version 2>/dev/null || echo "0.0.0")
        
        echo "  Local: $LOCAL_VERSION, NPM: $NPM_VERSION"
        
        # Compare versions using node semver logic
        SHOULD_PUBLISH=$(node -e "
            const semver = require('semver');
            const local = '$LOCAL_VERSION';
            const npm = '$NPM_VERSION';
            const force = '$FORCE_PUBLISH' === 'true';
            
            if (force) {
                console.log('true');
            } else if (npm === '0.0.0') {
                console.log('true');
            } else {
                console.log(semver.gt(local, npm) ? 'true' : 'false');
            }
        ")
        
        if [ "$SHOULD_PUBLISH" = "true" ]; then
            echo "  ✅ Will publish $PKG_NAME@$LOCAL_VERSION (npm has $NPM_VERSION)"
            PACKAGES_TO_PUBLISH="$PACKAGES_TO_PUBLISH$pkg_key,"
        else
            echo "  ⏭️  Skipping $PKG_NAME@$LOCAL_VERSION (same as or older than npm version $NPM_VERSION)"
        fi
    else
        echo "  ⚠️  Package.json not found for $pkg_key"
    fi
done

# Remove trailing comma
PACKAGES_TO_PUBLISH=${PACKAGES_TO_PUBLISH%,}

# Output for GitHub Actions
if [ -z "$PACKAGES_TO_PUBLISH" ]; then
    echo "has_packages_to_publish=false" >> ${GITHUB_OUTPUT:-/dev/stdout}
    echo "packages_to_publish=" >> ${GITHUB_OUTPUT:-/dev/stdout}
    echo "📋 No packages need to be published."
else
    echo "has_packages_to_publish=true" >> ${GITHUB_OUTPUT:-/dev/stdout}
    echo "packages_to_publish=$PACKAGES_TO_PUBLISH" >> ${GITHUB_OUTPUT:-/dev/stdout}
    echo "📋 Packages to publish: $PACKAGES_TO_PUBLISH"
fi
