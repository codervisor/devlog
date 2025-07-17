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
