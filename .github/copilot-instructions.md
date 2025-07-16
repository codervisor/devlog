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

### Testing Requirements

#### UI-Related Development Tasks
- **ALWAYS use Playwright**: Use Playwright MCP tools for UI validation
- **Base URL**: Always use `http://localhost:3000` for Playwright testing
- **No manual dev server**: Don't run `pnpm dev:web` manually (causes hot reload issues)

#### Build Dependencies
- **Build order**: Core → MCP → Web (follow dependency chain)
- **After core changes**: `pnpm --filter @devlog/core build` then restart MCP server

#### 🚨 Critical Debugging SOPs

##### Dev Server Location Verification
**CRITICAL**: Always verify dev servers run from correct worktree location
- ❌ **Wrong**: `pnpm --filter @devlog/web dev` (runs from main repo)
- ✅ **Correct**: `cd .wt/feature-name/packages/web && pnpm dev`
- **Verification**: Check terminal output shows worktree path, not main repo path
- **Symptoms**: Code changes not reflected, debug logs missing, tests using old code

##### Debugging Workflow
1. **Verify Location**: Ensure all processes run from worktree directory
2. **Build Dependencies**: Rebuild core package after changes: `pnpm build:core`
3. **Restart Services**: Kill and restart dev servers from worktree location
4. **Add Debug Logs**: Use obvious console.log statements to verify code execution
5. **Test Incrementally**: Verify each layer (API → data → UI) independently

##### Common Pitfalls
- ❌ Running `pnpm --filter` commands from main repo (ignores worktree changes)
- ❌ Assuming hot reload works across worktrees (often doesn't)
- ❌ Testing without rebuilding core package after interface changes
- ❌ Missing path verification when debugging "working" code that isn't

### Commit Early and Often
- After completing features/fixes in any worktree
- Before switching between worktrees
- When tests pass in current workspace

---
*Use git worktree for parallel development. Keep worktrees focused and clean up when done.*