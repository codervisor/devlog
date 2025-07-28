# Devlog Project - Copilot Instructions

<!-- ## 🚨 CRITICAL RULES (READ FIRST!)

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
5. **🔗 LINK WORK**: Reference devlog IDs in commits and documentation -->

## Development Philosophy (Brief)

**IMPORTANT**: This project is in early development. We prioritize clean, modern architecture over backwards compatibility.

- **Quality over continuity**: Well-architected solutions over preserving broken legacy code
- **Rapid iteration**: Make bold changes to improve codebase structure
- **Breaking changes acceptable**: Not bound by API compatibility during this phase

## 🔧 TypeScript ESM Requirements

### Import System Rules
- **File extensions**: Always add `.js` to import paths for runtime imports
- **Internal imports**: Use relative paths (`./`, `../`) within packages
- **Cross-package imports**: Use `@codervisor/devlog-*` aliases for inter-package references
- **Avoid self-reference aliases**: Don't use `@/` for intra-package imports (ambiguous)

### Examples
```typescript
// ✅ Correct patterns
import { DevlogManager } from './managers/devlog-manager.js';     // Internal
import { ChatParser } from '@codervisor/devlog-ai';                        // Cross-package
import type { DevlogEntry } from '../types/index.js';           // Type-only can omit .js

// ❌ Avoid these patterns
import { DevlogEntry } from '@/types';                          // Ambiguous self-reference
import { StorageProvider } from '../storage/providers';         // Missing .js extension
```

## Essential SOPs

### Documentation Synchronization Process

#### Instruction File Update Workflow
When making significant architectural or pattern changes:

1. **IMMEDIATE UPDATES**: Update instruction files as part of the same work session
2. **PATTERN DOCUMENTATION**: Add new patterns with examples to relevant instruction files
3. **DEPRECATION NOTES**: Mark old patterns as deprecated with migration guidance
4. **VALIDATION**: Test AI agent behavior with updated prompts
5. **REVIEW**: Ensure consistency across all instruction files

#### When to Update Instruction Files
- **New architectural patterns** (e.g., WorkspaceDevlogManager introduction)
- **Import/export pattern changes** (e.g., ESM .js extension requirements)
- **Testing methodology updates** (e.g., new test isolation patterns)
- **Tooling changes** (e.g., new build processes, new package structures)
- **Error pattern discoveries** (e.g., common mistakes to avoid)

#### Instruction File Maintenance Checklist
```markdown
For every significant architectural change:
□ Identify which instruction files need updates (.github/instructions/*.md)
□ Update examples to reflect current patterns
□ Add deprecation warnings for old patterns
□ Include migration guidance for existing code
□ Test AI agent behavior with new prompts
□ Verify consistency across all instruction files
□ Document the instruction update in devlog notes
```

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
- **Why this matters**: `pnpm build` overwrites `.next/` directory and breaks active development servers
- **Solution implemented**: 
  - `pnpm build:test` uses `.next-build/` directory (separate from dev server's `.next/`)
  - Dev servers can run concurrently with build testing
  - No workflow disruption when testing build success
- **Commands available**:
  - `docker compose -f docker-compose.dev.yml up web-dev -d --wait` - Runs containerized dev server in detached mode with health check wait
  - `pnpm build:test` - Tests build using `.next-build/` directory  
  - `pnpm build` - Production build (still uses `.next/` by default)

#### Docker-Based Development Policy
- **Use Docker Compose for development**: The development environment now runs in containers for consistency
- **Configurable storage**: Storage type determined by `.env` file configuration (PostgreSQL, SQLite, JSON, or GitHub)
- **Hot reloading preserved**: Volume mounts ensure code changes trigger hot reloads
- **Port management**: Docker handles port allocation and prevents conflicts
- **Environment isolation**: Development dependencies are containerized
- **⚠️ IMPORTANT**: Keep development container running during development sessions - do NOT stop unless explicitly requested
- **Commands**:
  - Start: `docker compose -f docker-compose.dev.yml up web-dev -d --wait`
  - Stop: `docker compose -f docker-compose.dev.yml down` (only when explicitly requested)
  - Logs: `docker compose logs web-dev -f`

#### UI-Related Development Tasks
- **ALWAYS use Playwright**: Use Playwright MCP tools for UI validation and debugging
- **Browser Tool Selection**:
  - **Playwright**: Required for React error debugging, console monitoring, state analysis
  - **Simple Browser**: Basic navigation/UI testing only - NOT reliable for error detection
- **Testing Steps**:
  - **Start Web App**: Run `docker compose -f docker-compose.dev.yml up web-dev -d --wait` to start the containerized web app (if not already running)
  - **Verify**: Ensure the web app is running correctly before testing (check http://localhost:3200)
  - **Run Tests**: Use Playwright to run UI tests against the web app
  - **Update Devlog**: Add test results and any fixes to the devlog entry
  - **Keep Running**: Leave the web app running for continued development (do NOT stop unless explicitly requested)

#### React Debugging Verification Protocol
- **MANDATORY for React Issues**: Use Playwright console monitoring before concluding any fix
- **Verification Checklist**:
  - [ ] Playwright console messages captured and analyzed
  - [ ] No "Maximum update depth exceeded" errors
  - [ ] No React warnings or error boundary triggers
  - [ ] Functional testing of affected user workflows
- **Multi-Stage Validation**: Apply Fix → Playwright Test → Console Analysis → User Flow Test → Confirmation
- **If ANY stage fails**: Return to analysis phase, do not mark issue as resolved

#### Build Dependencies
- **Build order**: Core → MCP → Web (follow dependency chain)
- **After core changes**: `pnpm --filter @codervisor/devlog-core build` then restart MCP server
