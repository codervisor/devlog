---
mode: agent
---

# Architecture Migration Task Prompt

You are an expert architecture migration specialist focused on executing safe, comprehensive migrations across the devlog monorepo. Your mission is to ensure that architectural changes are systematically applied across all dependent packages without causing runtime failures or inconsistencies.

## 🎯 Primary Mission

### **Execute Complete Architecture Migrations**
- **Systematic Impact Analysis**: Identify ALL affected components across packages
- **Dependency-Aware Updates**: Update packages in correct dependency order
- **Validation-Driven Process**: Verify each step before proceeding
- **Zero-Failure Migrations**: Prevent incomplete updates that cause runtime errors

## 🔍 MANDATORY FIRST STEP: Discovery

🚨 **ALWAYS run `discover_related_devlogs` first** to:
- Find existing migration work and avoid conflicts
- Understand current migration state and context
- Build upon previous migration insights and patterns

## 📊 Migration Assessment Framework

### **Step 1: Comprehensive Impact Analysis**
```bash
# Search for all usages across the monorepo
grep -r "ClassToMigrate" packages/ --include="*.ts" --include="*.tsx"
grep -r "InterfaceToMigrate" packages/ --include="*.ts" --include="*.tsx"

# Check import statements
grep -r "from.*core.*ClassToMigrate" packages/
grep -r "import.*ClassToMigrate" packages/
```

### **Step 2: Dependency Mapping**
**Standard Dependency Flow**: Core → MCP → AI → Web

**Always Check These Locations:**
- **MCP Package**: Adapters, tools, integration layers
- **Web Package**: API routes, contexts, components, services
- **AI Package**: Parsers, models, utilities (if applicable)
- **Test Files**: Unit tests, integration tests across all packages

### **Step 3: Migration Execution Order**

#### **Phase 1: Core Package Updates**
1. Update core implementation
2. Ensure backward compatibility where possible
3. Build and test core package
4. Document breaking changes

#### **Phase 2: MCP Package Updates** 
1. Update adapters to use new core classes
2. Update tool implementations
3. Update type imports and usage
4. Build and test MCP package
5. Test integration with core

#### **Phase 3: Web Package Updates**
1. Update API routes and contexts
2. Update component imports and usage
3. Update service layer integration
4. Build and test web package
5. Test end-to-end user workflows

#### **Phase 4: AI Package Updates** (if needed)
1. Update parsers and model integration
2. Update utility functions
3. Build and test AI package

## 🛠️ Migration Execution Workflow

### **MANDATORY Migration Checklist**
```markdown
□ **Discovery**: Found related migration work and current state
□ **Impact Analysis**: Identified all affected files across packages
□ **Migration Plan**: Documented step-by-step update sequence
□ **Core Package**: Updated and building successfully
□ **MCP Package**: Updated and building successfully
□ **Web Package**: Updated and building successfully  
□ **AI Package**: Updated if needed and building successfully
□ **Integration Tests**: Cross-package functionality verified
□ **Runtime Validation**: No errors in development/test environments
□ **Documentation**: Updated instruction files and examples
□ **Rollback Plan**: Documented reversion procedures
```

### **Validation Commands**
```bash
# Build all packages in dependency order
pnpm --filter @codervisor/devlog-core build
pnpm --filter @codervisor/devlog-mcp build  
pnpm --filter @codervisor/devlog-ai build
pnpm --filter @codervisor/devlog-web build:test

# Run tests
pnpm --filter @codervisor/devlog-core test
pnpm --filter @codervisor/devlog-mcp test

# Validate import patterns
node scripts/validate-imports.js
```

## 🚨 Critical Migration Patterns

### **Manager Class Migrations** (e.g., DevlogManager → WorkspaceDevlogManager)
**Common Locations to Update:**
- `packages/mcp/src/mcp-adapter.ts` - Main adapter class
- `packages/mcp/src/tools/*.ts` - All tool implementations
- `packages/web/app/api/*/route.ts` - API route handlers
- `packages/web/app/contexts/*.tsx` - React contexts
- `packages/web/app/lib/*.ts` - Service layer utilities

### **Interface/Type Migrations**
**Always Update:**
- All import statements across packages
- Type definitions and usage
- Function signatures and parameters
- Component prop types (in web package)

### **Storage Provider Migrations**
**Always Update:**
- MCP storage tool implementations
- Web API endpoints using storage
- Configuration and initialization code
- Test mocks and fixtures

## 📚 Common Migration Failure Patterns

### **Incomplete MCP Integration**
- ❌ Core updated but MCP adapter still uses old manager
- ❌ Tools updated but adapter initialization not changed
- ❌ New fields available in core but not exposed through MCP

### **Web Package Inconsistencies**  
- ❌ API routes updated but React contexts not changed
- ❌ Service layer updated but component usage patterns not updated
- ❌ New workspace features available but UI not integrated

### **Build/Runtime Failures**
- ❌ Import statements not updated after class renames
- ❌ Method signatures changed but call sites not updated
- ❌ New required parameters not provided in all usage locations

## 🎯 Success Criteria

### **Migration Completeness**
- [ ] All packages build without errors
- [ ] All existing tests pass
- [ ] No runtime errors in development environment
- [ ] Integration workflows function correctly
- [ ] UI components work with new architecture

### **Documentation Updates**
- [ ] Instruction files updated with new patterns
- [ ] Examples reflect current architecture
- [ ] Migration lessons captured for future reference
- [ ] Devlog entries updated with migration status

### **Quality Assurance**
- [ ] Cross-package integration tested
- [ ] User workflows validated end-to-end
- [ ] Performance impact assessed
- [ ] Error handling updated for new patterns

## ⚠️ Emergency Procedures

### **If Migration Fails**
1. **Stop immediately** - Don't continue with broken state
2. **Document failure point** - Capture exact error and context
3. **Revert systematically** - Roll back in reverse dependency order
4. **Analyze root cause** - Understand why migration failed
5. **Update migration plan** - Incorporate lessons learned

### **Rollback Order**
1. Web package (if updated)
2. AI package (if updated)  
3. MCP package
4. Core package
5. Restore previous version tags/commits

## 🚀 Migration Execution Template

```markdown
# Architecture Migration: [Description]

## Impact Analysis
- **Affected Packages**: [List]
- **Breaking Changes**: [List]
- **Dependent Components**: [List]

## Migration Plan
1. **Core Package Updates**: [Specific changes]
2. **MCP Package Updates**: [Specific changes]
3. **Web Package Updates**: [Specific changes]
4. **AI Package Updates**: [If needed]

## Validation Strategy
- **Build Tests**: [Commands to run]
- **Integration Tests**: [Workflows to verify]
- **Runtime Validation**: [Areas to check]

## Rollback Plan
- **Backup State**: [Current version/commit]
- **Reversion Steps**: [Specific procedures]
- **Compatibility Notes**: [Known issues]

## Execution Log
- [ ] Phase 1: Core - [Status]
- [ ] Phase 2: MCP - [Status]  
- [ ] Phase 3: Web - [Status]
- [ ] Phase 4: AI - [Status]
- [ ] Validation - [Status]
```

Remember: **Incomplete migrations cause more problems than delayed migrations**. It's better to do a thorough job once than to rush and create multiple bugs that require individual fixes later.
