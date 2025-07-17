# Devlog Project - Copilot Instructions

## 🚨 CRITICAL RULES (READ FIRST!)

### ⚠️ MANDATORY FIRST STEP: Always Discover Before Creating

🔍 BEFORE creating ANY devlog entry, ALWAYS run: `discover_related_devlogs`

**Why this matters:**
- Prevents duplicate work and entries
- Builds upon existing insights and progress
- Maintains project continuity and context

## 📋 Devlog Creation Workflow

**This project uses ITSELF for development tracking. ALWAYS follow this workflow:**

### ✅ Required Devlog Creation Steps
1. **🔍 DISCOVER FIRST**: Use `discover_related_devlogs` to find existing relevant work
2. **📖 REVIEW**: Analyze discovered entries to understand context and avoid overlaps
3. **✅ CREATE ONLY IF NEEDED**: Create new devlog entry using MCP tools only if no overlapping work exists
4. **📝 TRACK PROGRESS**: Update entries with notes and status changes via MCP functions
5. **🔗 LINK WORK**: Reference devlog IDs in commits and documentation

## Development Philosophy (Brief)

**IMPORTANT**: This project is in early development. We prioritize clean, modern architecture over backwards compatibility.

- **Quality over continuity**: Well-architected solutions over preserving broken legacy code
- **Rapid iteration**: Make bold changes to improve codebase structure
- **Breaking changes acceptable**: Not bound by API compatibility during this phase

## Essential SOPs

### Temporary Files and Scripts

#### Use `tmp/` Folder for Temporary Work
- **ALWAYS use `tmp/` folder**: Place all temporary scripts, test files, and experimental code in the `tmp/` directory
- **Not committed to git**: The `tmp/` folder is gitignored and will not be committed to version control
- **Examples of tmp/ usage**:
  - Test scripts for debugging
  - Temporary configuration files
  - Experimental code snippets
  - One-off migration scripts
  - Build artifacts for testing
- **Clean up**: Remove temporary files when no longer needed to keep the tmp directory tidy

### Testing Requirements

#### Build vs Dev Server Conflicts
- **Use `pnpm build:test` for AI testing**: When AI agents need to test builds, always use `pnpm build:test` instead of `pnpm build`
- **Why this matters**: `pnpm build` overwrites `.next/` directory and breaks active `dev:web` servers
- **Solution implemented**: 
  - `pnpm build:test` uses `.next-build/` directory (separate from dev server's `.next/`)
  - Dev servers can run concurrently with build testing
  - No workflow disruption when testing build success
- **Commands available**:
  - `pnpm dev:web` - Runs dev server using `.next/` directory
  - `pnpm build:test` - Tests build using `.next-build/` directory  
  - `pnpm build` - Production build (still uses `.next/` by default)

#### Single Dev Server Policy
- **One server at a time**: `pnpm dev:web` uses fixed port 3000 and will fail if port is occupied
- **Clear feedback**: Shows existing servers before attempting to start new one
- **Preserve hot reload**: Don't kill existing servers - let developers use the running one
- **Error handling**: Next.js EADDRINUSE error clearly indicates when port 3000 is busy
- **Check existing servers**: The dev command shows what's running on ports 3000-3002 before starting

#### UI-Related Development Tasks
- **ALWAYS use Playwright**: Use Playwright MCP tools for UI validation
- **Testing Steps**:
  - **Start Web App**: Run `pnpm --filter @devlog/web dev` to start the web app
  - **Verify**: Ensure the web app is running correctly before testing
  - **Run Tests**: Use Playwright to run UI tests against the web app
  - **Update Devlog**: Add test results and any fixes to the devlog entry
  - **Stop Web App**: After testing, stop the web app with `Ctrl+C` in the terminal

#### Build Dependencies
- **Build order**: Core → MCP → Web (follow dependency chain)
- **After core changes**: `pnpm --filter @devlog/core build` then restart MCP server
