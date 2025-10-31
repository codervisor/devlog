# Development Documentation

This directory contains feature design documents organized by date and feature name.

## Structure

Each feature gets its own folder with the format: `YYYYMMDD-feature-name/`

The date represents when the feature design was started or last significantly updated.

## Active Features

### �️ Database Architecture (October 2025)
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

### 📊 Agent Observability Core Features (October 2025)
**Status**: ✅ Phase 1 Complete  
**Folder**: [20251022-agent-observability-core-features/](./20251022-agent-observability-core-features/)

Dashboard with real-time metrics, sessions page with active/history views, and API routes. Foundation built for visualization layer.

### 📊 AI Evaluation System (October 2025)
**Status**: 📅 Planned  
**Folder**: [20251021-ai-evaluation-system/](./20251021-ai-evaluation-system/)

Quantitative evaluation system for AI coding agents using TSR/HEI/OQS metrics. Design complete, implementation pending.

---

Each feature folder contains its own documentation. Browse the dated folders to see full details.

### Recommended Document Structure

While not mandatory, consider including:
- `*-design.md` - Full technical design specification
- `*-summary.md` or `README.md` - Quick overview and key points
- `*-implementation-checklist.md` - Phase-by-phase tasks (optional)
- `*-quick-reference.md` - Quick reference guide (optional)
- Additional technical deep-dives as needed

Each folder should contain a clear status indicator in one of its documents.

## Guidelines

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
