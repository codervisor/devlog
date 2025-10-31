# Specifications (Specs)

> **Note**: This directory is a symlink to `specs/` at the project root. "Specs", "dev docs", and "development documentation" are interchangeable terms.

This directory contains **specifications** following **Spec-Driven Development (SDD)** - document design before implementation.

## 📁 Structure

**Multi-tier hierarchy**: `YYYYMMDD/NNN-short-name/`

- **Level 1**: `YYYYMMDD/` - Date folder (when spec design begins)
- **Level 2**: `NNN-short-name/` - Numbered spec within that date (starting from `000`)

**Example**:
```
specs/
├── 20251031/
│   ├── 000-database-architecture/
│   ├── 001-project-hierarchy/
│   └── 002-api-refactor/
└── 20251101/
    └── 000-auth-system/
```

## 🛠️ Utility Scripts

```bash
# Create new spec (auto-increments NNN)
pnpm spec:create "short-name" "Optional Title"

# List active specs
pnpm spec:list

# Archive completed spec
pnpm spec:archive "20251031/000-database-architecture"
```

## Active Specs

### 🏗️ Database Architecture (October 2025)
**Status**: ✅ Design Complete  
**Folder**: [20251031-database-architecture/](./20251031-database-architecture/)

PostgreSQL + TimescaleDB architecture for AI agent observability. Defines time-series optimization, project hierarchy storage, and operational guidelines.

### 🏗️ Project Hierarchy Redesign (October 2025)
**Status**: 📋 Design Phase  
**Folder**: [20251031-project-hierarchy-redesign/](./20251031-project-hierarchy-redesign/)

Establish proper hierarchy for tracking AI agent activities: Organization → Projects → Machines → Workspaces → Sessions → Events. Resolves confusion between projects and workspaces.

### �🔧 Codebase Reorganization (October 2025)
**Status**: ✅ Phase 2 Complete (Phase 3 Ready)  
**Folder**: [20251021-codebase-reorganization/](./20251021-codebase-reorganization/)

Comprehensive codebase reorganization to reflect AI agent observability focus. Phase 1 (terminology) and Phase 2 (code structure) complete. Phase 3 (UI/UX) ready to begin.

**Completion Roadmap**: [20251030-completion-roadmap/](./20251030-completion-roadmap/)

### 🔍 AI Agent Observability (January 2025)
**Status**: 🚧 In Progress (Phase 0 - Go Collector)  
**Folder**: [20251021-ai-agent-observability/](./20251021-ai-agent-observability/)

Transform devlog into an AI coding agent observability platform. Currently implementing the Go collector (Days 1-4 complete, 20% done).
---

Browse the dated folders to see full details on each spec.

## 📝 Recommended Document Structure

While not mandatory, consider including:
- `design.md` - Full technical design specification
- `README.md` or `summary.md` - Quick overview
- `implementation.md` or `checklist.md` - Implementation tasks
- `reference.md` - Quick reference for completed features

**Status indicators**: 📅 Planned | 🚧 In Progress | ✅ Complete | ⏸️ Paused | ❌ Cancelled

## 🎯 When to Create a Spec

Create a spec when starting:
- Significant features requiring design/planning (>2 days work)
- Architectural decisions affecting multiple components
- Complex features needing documentation
- Breaking changes or major refactors

**Don't create specs for**: Small bug fixes, minor tweaks, routine maintenance, simple one-file changes.

## 📖 Historical Notes

- **November 2025**: Migrated to multi-tier hierarchy (`YYYYMMDD/NNN-name/`)
- **October 2025**: Organized as `YYYYMMDD-feature-name/`
- **Pre-October 2025**: Docs lived in `docs/design/`

**Backward compatibility**: The `docs/dev/` path remains available as a symlink to `specs/` for existing scripts and documentation references.
When creating new feature documentation:

1. Create a new folder: `docs/dev/YYYYMMDD-feature-name/`
2. Use the current date when starting the design
3. Include a main design document and optionally:
   - Executive summary
   - Implementation checklist
   - Quick reference guide
   - Technical deep-dives

## Historical Notes

Prior to October 2025, design docs lived in `docs/design/`. They have been reorganized into this date-prefixed structure for better tracking and organization.
