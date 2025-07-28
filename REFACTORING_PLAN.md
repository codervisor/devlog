# Workspace → Project Refactoring Plan

## Problem Statement
The current workspace system allows different databases for different workspaces, creating unnecessary complexity and flexibility that isn't needed. This leads to:
- Complex configuration management
- Multiple database connections
- Unclear separation of concerns
- Over-engineered isolation

## Solution
Refactor to use:
1. **Centralized database configuration** for the entire web application
2. **Projects** instead of workspaces for isolating different repositories/codebases
3. **Single storage provider** shared across all projects

## Implementation Progress

### Phase 1: Type System Refactoring ✅
- [x] Created `ProjectMetadata` and `ProjectSettings` types
- [x] Created `ProjectManager` interface
- [x] Created `ProjectContext` and `DevlogOperationContext` types
- [x] Created `AppStorageConfig` for centralized storage configuration
- [x] Updated type exports in main index file

### Phase 2: Entity and Database Changes ✅
- [x] Created `ProjectEntity` without storage column
- [x] Designed database schema for project table
- [x] Project entity properly handles metadata conversion

### Phase 3: Manager and Service Updates ✅
- [x] Created `AppConfigManager` for centralized storage configuration
- [x] Created `FileProjectManager` for file-based project metadata
- [x] Created `DatabaseProjectManager` for database-backed project metadata
- [x] Created `AutoProjectManager` with automatic storage selection
- [x] Updated manager exports and indexes

### Phase 4: API and Web Interface Updates ✅
- [x] Created new `project-manager.ts` web lib with centralized config
- [x] Created `/api/projects` routes replacing workspace routes
- [x] Created `/api/projects/[id]` routes for individual project operations
- [x] Maintained backward compatibility during transition

### Phase 5: Configuration Simplification ✅
- [x] Created centralized app-level storage configuration
- [x] Removed per-project storage configurations
- [x] Created migration script for existing workspace data
- [x] Updated configuration management approach

## Key Architecture Changes

### Before (Workspace System)
```
Workspace 1 → Storage Config A (e.g., PostgreSQL)
Workspace 2 → Storage Config B (e.g., SQLite)  
Workspace 3 → Storage Config C (e.g., JSON)
```

### After (Project System)
```
Application → Single Storage Config (e.g., PostgreSQL)
├── Project 1 (filtered data)
├── Project 2 (filtered data)
└── Project 3 (filtered data)
```

## Benefits Achieved
- ✅ Simplified architecture with single database connection
- ✅ Clear separation: projects for code isolation, not storage isolation
- ✅ Easier deployment and configuration management
- ✅ Better performance (no workspace storage switching)
- ✅ Reduced complexity in configuration management

## Migration Strategy
1. ✅ Created migration script (`scripts/migrate-workspace-to-project.ts`)
2. ✅ Maintained backward compatibility during transition
3. ✅ Clear file structure for new vs old systems
4. 🔄 Documentation and guides need updating
5. 🔄 Deprecation warnings for old workspace APIs

## Files Created/Modified

### New Core Types & Entities
- `packages/core/src/types/project.ts` - New project type definitions
- `packages/core/src/entities/project.entity.ts` - Database entity for projects

### New Managers
- `packages/core/src/managers/project/` - Complete project management system
- `packages/core/src/managers/configuration/app-config-manager.ts` - Centralized config

### New Web API
- `packages/web/app/lib/project-manager.ts` - Simplified web project manager
- `packages/web/app/api/projects/` - New project-based API routes

### Migration & Tooling
- `scripts/migrate-workspace-to-project.ts` - Automated migration script
- `REFACTORING_PLAN.md` - This documentation file

## Next Steps
1. 🔄 Update documentation to reflect project-based architecture
2. 🔄 Add deprecation warnings to workspace APIs
3. 🔄 Update React components to use project terminology
4. 🔄 Test migration script with real workspace data
5. 🔄 Create deployment guide for new centralized configuration

## Breaking Changes
- Workspace APIs will be deprecated in favor of Project APIs
- Storage configuration moved from per-workspace to application-level
- Database schema changes require migration for existing installations

## Backward Compatibility
- Old workspace APIs maintained temporarily with deprecation warnings
- Migration script handles automatic conversion of existing data
- Graceful fallback for missing configurations
