# Devlog Project - Copilot Instructions

## 🚨 CRITICAL: Devlog Creation Workflow (READ FIRST!)

**This project uses ITSELF for development tracking. ALWAYS follow this workflow:**

### ⚠️ MANDATORY FIRST STEP: Always Discover Before Creating

🔍 BEFORE creating ANY devlog entry, ALWAYS run: `discover_related_devlogs`

**Why this matters:**
- Prevents duplicate work and entries  
- Builds upon existing insights and progress
- Maintains project continuity and context

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
- **ALWAYS use Playwright**: For any UI-related development tasks, ALWAYS use Playwright MCP tools to validate changes
- **Browser-based validation**: Use Playwright for UI and integration testing (clicking, typing, form submissions, navigation, etc.)
- **UI Feature Development**: For @devlog/web UI-related features, ALWAYS use browser-based testing for feature validation during development
- **Web application**: By default, it should be started by myself with the address `http://localhost:3000`. DO NOT run it with `pnpm dev:web`, i.e. Web: Dev (Full Stack) yourself!
- **No manual builds**: DO NOT run `pnpm build` manually during web app development - causes hot update inconsistency issues

#### Other Development Tasks
- **Temporary scripts**: Allowed in `tmp/` directory (gitignored) for quick validation and debugging of non-UI features
- **API/Logic testing**: Use appropriate testing methods for backend, API, or logic-focused development

#### General Rules
- **Prohibited**: Never create test scripts in tracked directories (`.` root, `src/`, `scripts/`, etc.)
- **Clean up**: Remove temporary files from `tmp/` when done

### Commit Early and Often
- After completing features/fixes
- Before risky operations  
- At session milestones
- When tests pass

---
*For detailed instructions on any topic, see the linked guides above.*
