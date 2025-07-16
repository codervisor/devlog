# Devlog Project - Copilot Instructions

## 🚨 CRITICAL RULES (READ FIRST!)

### ⛔ NEVER WORK DIRECTLY ON MAIN BRANCH
**MANDATORY**: All development MUST use feature branches + git worktrees
- ✅ Create feature branch: `git checkout -b feature/name`
- ✅ Create worktree: `git worktree add ../devlog-feature-name feature/name`
- ✅ Work in worktree: `cd ../devlog-feature-name`
- ❌ NEVER edit files while on main branch

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

## 🌿 Git Worktree Workflow (MANDATORY FOR ALL DEVELOPMENT)

**⚠️ CRITICAL: NEVER work directly on the main branch! Always use feature branches and worktrees.**

### 📋 Required Workflow for ALL Development Tasks

#### Step 1: Create Feature Branch & Worktree
```bash
# 1. Create and checkout a new feature branch
git checkout -b feature/your-feature-name

# 2. Create a worktree for this feature (REQUIRED)
git worktree add ../devlog-feature-name feature/your-feature-name

# 3. Move to the new worktree
cd ../devlog-feature-name
```

#### Step 2: Work in Isolation
- **All development** must happen in the feature worktree
- **Test changes** in isolation before merging
- **Commit frequently** with descriptive messages

#### Step 3: Clean Integration
```bash
# 1. Ensure all changes are committed
git add . && git commit -m "feat: implement feature"

# 2. Return to main worktree
cd ../devlog

# 3. Merge feature branch
git checkout main
git merge feature/your-feature-name

# 4. Clean up worktree and branch
git worktree remove ../devlog-feature-name
git branch -d feature/your-feature-name
```

### 🚫 What NOT to Do
- ❌ **Never make changes directly on main branch**
- ❌ **Never skip creating a worktree for development**
- ❌ **Never work on multiple features in the same worktree**
- ❌ **Never leave abandoned worktrees**

### ✅ Naming Conventions
- **Feature branches**: `feature/descriptive-name`
- **Bugfix branches**: `bugfix/issue-description`
- **Worktree directories**: `../devlog-{feature-name}` (always outside main repo)

### 📁 Example Worktree Structure
```
devlog/                    # Main repository (for merging only)
../devlog-ui-dashboard/    # UI dashboard feature
../devlog-api-endpoints/   # API endpoints feature
../devlog-bugfix-auth/     # Authentication bugfix
```

### 🔄 Parallel Development Pattern
When working on multiple features simultaneously:
1. Each feature gets its own branch + worktree
2. Switch between worktrees as needed
3. Test each feature independently
4. Merge features to main one at a time

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

### Commit Early and Often
- After completing features/fixes in any worktree
- Before switching between worktrees
- When tests pass in current workspace

---
*Use git worktree for parallel development. Keep worktrees focused and clean up when done.*