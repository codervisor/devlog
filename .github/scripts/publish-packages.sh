#!/bin/bash
# Publish packages to NPM
set -euo pipefail

PACKAGES_TO_PUBLISH=${1:-""}

if [ -z "$PACKAGES_TO_PUBLISH" ]; then
    echo "⚠️  No packages specified for publishing"
    exit 0
fi

echo "📦 Publishing packages to NPM: $PACKAGES_TO_PUBLISH"

IFS=',' read -ra PACKAGE_ARRAY <<< "$PACKAGES_TO_PUBLISH"

PUBLISHED_PACKAGES=""

for pkg in "${PACKAGE_ARRAY[@]}"; do
    case $pkg in
        "mcp")
            echo "📤 Publishing @codervisor/devlog-mcp..."
            cd packages/mcp
            npm publish --access public
            PUBLISHED_PACKAGES="$PUBLISHED_PACKAGES@codervisor/devlog-mcp@$(jq -r '.version' package.json) "
            cd ../..
            ;;
        "core")
            echo "📤 Publishing @codervisor/devlog-core..."
            cd packages/core
            npm publish --access public
            PUBLISHED_PACKAGES="$PUBLISHED_PACKAGES@codervisor/devlog-core@$(jq -r '.version' package.json) "
            cd ../..
            ;;
        "ai")
            echo "📤 Publishing @codervisor/devlog-ai..."
            cd packages/ai
            npm publish --access public
            PUBLISHED_PACKAGES="$PUBLISHED_PACKAGES@codervisor/devlog-ai@$(jq -r '.version' package.json) "
            cd ../..
            ;;
        "cli")
            echo "📤 Publishing @codervisor/devlog-cli..."
            cd packages/cli
            npm publish --access public
            PUBLISHED_PACKAGES="$PUBLISHED_PACKAGES@codervisor/devlog-cli@$(jq -r '.version' package.json) "
            cd ../..
            ;;
        *)
            echo "⚠️  Unknown package: $pkg"
            ;;
    esac
done

# Output for GitHub Actions
echo "published_packages=$PUBLISHED_PACKAGES" >> ${GITHUB_OUTPUT:-/dev/stdout}
echo "✅ Successfully published: $PUBLISHED_PACKAGES"
