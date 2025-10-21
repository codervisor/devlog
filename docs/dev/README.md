# Development Documentation

This directory contains feature design documents organized by date and feature name.

## Structure

Each feature gets its own folder with the format: `YYYYMMDD-feature-name/`

The date represents when the feature design was started or last significantly updated.

## Active Features

### 🔧 Codebase Reorganization (October 2025)
**Status**: 📋 Planning  
**Folder**: [20251021-codebase-reorganization/](./20251021-codebase-reorganization/)

Comprehensive plan to reorganize the codebase to reflect the AI agent observability focus. Includes 4-week plan and quick wins guide.

### 🔍 AI Agent Observability (January 2025)
**Status**: 🚧 In Progress (Phase 0 - Go Collector)  
**Folder**: [20250115-ai-agent-observability/](./20250115-ai-agent-observability/)

Transform devlog into an AI coding agent observability platform. Currently implementing the Go collector (Days 1-4 complete, 20% done).

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
