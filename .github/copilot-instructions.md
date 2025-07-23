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

## 🔧 TypeScript ESM Requirements

### Import System Rules
- **File extensions**: Always add `.js` to import paths for runtime imports
- **Internal imports**: Use relative paths (`./`, `../`) within packages
- **Cross-package imports**: Use `@devlog/*` aliases for inter-package references
- **Avoid self-reference aliases**: Don't use `@/` for intra-package imports (ambiguous)

### Examples
```typescript
// ✅ Correct patterns
import { DevlogManager } from './managers/devlog-manager.js';     // Internal
import { ChatParser } from '@devlog/ai';                        // Cross-package
import type { DevlogEntry } from '../types/index.js';           // Type-only can omit .js

// ❌ Avoid these patterns
import { DevlogEntry } from '@/types';                          // Ambiguous self-reference
import { StorageProvider } from '../storage/providers';         // Missing .js extension
```

## ⚠️ AUTOMATIC MIGRATION DETECTION

### 🚨 **Contextual Migration Prompts**
**These prompts trigger automatically based on file patterns being edited:**

#### **When editing `packages/core/src/managers/**/*.ts`:**
```
⚠️  MIGRATION CHECK: Manager class changes often affect:
- MCP adapter (packages/mcp/src/mcp-adapter.ts)
- Web API routes (packages/web/app/api/*/route.ts)  
- Web contexts (packages/web/app/contexts/*.tsx)

Run: grep -r "ManagerClassName" packages/ --include="*.ts"
```

#### **When editing `packages/core/src/types/**/*.ts`:**
```
⚠️  MIGRATION CHECK: Type changes often affect:
- All packages importing these types
- MCP tool parameter validation
- Web component prop types

Run: grep -r "TypeName" packages/ --include="*.ts" --include="*.tsx"
```

#### **When editing `packages/core/src/storage/**/*.ts`:**
```
⚠️  MIGRATION CHECK: Storage changes often affect:
- MCP storage tools (packages/mcp/src/tools/*)
- Web API endpoints (packages/web/app/api/*)
- Configuration and initialization code

Run: grep -r "StorageInterface" packages/ --include="*.ts"
```

#### **When making any @devlog/core changes:**
```
⚠️  AUTO-CHECK: After core changes, verify:
1. pnpm detect-migration  # Automatic migration detection
2. pnpm --filter @devlog/mcp build
3. pnpm --filter @devlog/web build:test  
4. Check for new compilation errors in dependent packages
```

#### **Before starting any development session:**
```
💡 PROACTIVE CHECK: Run automatic migration detection:
pnpm detect-migration

This scans recent changes and identifies potential cross-package impacts
that require migration attention.
```

## 🔄 Architecture Migration Protocol

### ⚠️ CRITICAL: For Major Architecture Changes

**When modifying core classes, interfaces, or manager patterns:**

### **MANDATORY Migration Steps:**
1. **🔍 IMPACT ANALYSIS FIRST**: Map all dependent packages and components
   - Search for usage across ALL packages (`grep -r "ClassName" packages/`)
   - Identify adapters, API routes, tests, and integration points
   - Document breaking changes and compatibility requirements

2. **📋 MIGRATION PLAN**: Create systematic update sequence
   - **Order**: Core → MCP → AI → Web (follow dependency chain)
   - **Validation**: Build and test each package after updates
   - **Integration**: Test cross-package functionality

3. **✅ VALIDATION STRATEGY**: Define success criteria and checkpoints
   - All packages build successfully
   - All tests pass
   - Integration workflows function correctly
   - No runtime errors in dependent packages

4. **🔙 ROLLBACK PLAN**: Document reversion procedures
   - Backup state before migration
   - Clear steps to restore previous version
   - Dependency version compatibility matrix

### **Cross-Package Dependency Map:**
- **@devlog/core changes** → ALWAYS update @devlog/mcp, @devlog/web APIs
- **Manager class changes** → Update adapters, API routes, tests, web contexts
- **Type/Interface changes** → Update ALL imports and usages across packages
- **Storage provider changes** → Update web API endpoints and MCP tools

### **Migration Validation Checklist:**
```markdown
□ Impact analysis completed across all packages
□ Migration plan documented with specific steps
□ Core package updated and builds successfully
□ MCP package updated and builds successfully  
□ Web package updated and builds successfully
□ AI package updated and builds successfully (if affected)
□ All cross-package tests pass
□ Integration workflows validated
□ Rollback procedure documented and tested
□ Related devlog entries updated with migration status
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
- **ALWAYS use Playwright**: Use Playwright MCP tools for UI validation and debugging
- **Browser Tool Selection**:
  - **Playwright**: Required for React error debugging, console monitoring, state analysis
  - **Simple Browser**: Basic navigation/UI testing only - NOT reliable for error detection
- **Testing Steps**:
  - **Start Web App**: Run `pnpm dev:web` to start the web app
  - **Verify**: Ensure the web app is running correctly before testing
  - **Run Tests**: Use Playwright to run UI tests against the web app
  - **Update Devlog**: Add test results and any fixes to the devlog entry
  - **Stop Web App**: After testing, stop the web app with `Ctrl+C` in the terminal

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
- **After core changes**: `pnpm --filter @devlog/core build` then restart MCP server
