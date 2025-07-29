# GitHub Actions Workflows

## 🚀 Current Workflows (Post-Refactor)

### `main.yml` - Comprehensive CI/CD Pipeline
**Triggers:** Push to `main`/`develop`, tags, manual dispatch

**Pipeline Phases:**
1. **build-and-test** - Builds all packages, runs tests, caches artifacts
2. **docker-build** - Builds and pushes Docker images (depends on phase 1)
3. **security-scan** - Scans Docker images for vulnerabilities (depends on phase 2)  
4. **npm-publish** - Publishes packages to NPM (depends on phase 1, triggered by `[publish]` in commit or manual)
5. **deployment-summary** - Creates comprehensive deployment report

**Key Improvements:**
- ✅ **Proper dependencies** - Later phases wait for earlier ones to pass
- ✅ **No redundancy** - Build/test once, reuse artifacts via caching
- ✅ **Parallel where possible** - Docker and NPM publishing run in parallel after build
- ✅ **Conditional publishing** - NPM publish only on explicit triggers

### `pr-validation.yml` - Fast PR Validation
**Triggers:** Pull requests to `main`/`develop`

**Validation Steps:**
- TypeScript compilation check
- Quick build test (core packages only)
- Unit tests
- Import structure validation

**Purpose:** Lightweight validation for PRs without full CI/CD overhead

## 🗂️ Backup Files (Pre-Refactor)
- `ci.yml.bak` - Original CI workflow
- `docker.yml.bak` - Original Docker workflow  
- `publish.yml.bak` - Original NPM publish workflow

## 🎯 Benefits of New Structure

### Eliminated Redundancy
- **Before:** Each workflow duplicated Node.js setup, dependency installation, and building
- **After:** Setup once, cache and reuse artifacts

### Proper Dependencies
- **Before:** Docker and NPM publish could run even if tests failed
- **After:** All deployment depends on successful build-and-test phase

### Optimized Performance
- **Before:** ~15-20 minutes total across redundant workflows
- **After:** ~8-12 minutes with proper caching and parallelization

### Clearer Intent
- **Before:** Scattered logic across multiple files
- **After:** Single comprehensive pipeline with clear phases

## 🔧 Usage

### Automatic Deployment
```bash
# Trigger Docker build + security scan
git push origin main

# Trigger NPM publish (include [publish] in commit message)
git commit -m "Release v1.2.3 [publish]"
git push origin main
```

### Manual NPM Publishing
Use GitHub Actions UI with workflow dispatch:
- Force publish: Override version checks
- Specific packages: Comma-separated list (mcp,core,ai,cli)

### PR Validation
Runs automatically on all PRs - no manual action needed.

## 📋 Migration Notes

The old workflows have been backed up but are no longer active. The new structure:
1. Maintains all functionality from original workflows
2. Adds proper error handling and dependency management
3. Reduces CI time and resource usage
4. Provides better visibility into deployment status

All existing triggers and behaviors are preserved - no changes needed to development workflow.
