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
            pnpm publish --access public --no-git-checks
            PUBLISHED_PACKAGES="$PUBLISHED_PACKAGES@codervisor/devlog-mcp@$(grep '"version"' package.json | cut -d'"' -f4) "
            cd ../..
            ;;
        "core")
            echo "📤 Publishing @codervisor/devlog-core..."
            cd packages/core
            pnpm publish --access public --no-git-checks
            PUBLISHED_PACKAGES="$PUBLISHED_PACKAGES@codervisor/devlog-core@$(grep '"version"' package.json | cut -d'"' -f4) "
            cd ../..
            ;;
        "ai")
            echo "📤 Publishing @codervisor/devlog-ai..."
            cd packages/ai
            pnpm publish --access public --no-git-checks
            PUBLISHED_PACKAGES="$PUBLISHED_PACKAGES@codervisor/devlog-ai@$(grep '"version"' package.json | cut -d'"' -f4) "
            cd ../..
            ;;
        "cli")
            echo "📤 Publishing @codervisor/devlog-cli..."
            cd packages/cli
            pnpm publish --access public --no-git-checks
            PUBLISHED_PACKAGES="$PUBLISHED_PACKAGES@codervisor/devlog-cli@$(grep '"version"' package.json | cut -d'"' -f4) "
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
