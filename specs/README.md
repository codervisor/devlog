# Specifications (Specs)

This directory contains **specifications** for features, designs, and technical decisions. "Specs" follows the **Spec-Driven Development (SDD)** approach, where specifications guide implementation.

> **Alias**: "dev docs" or "development documentation" can be used interchangeably with "specs"

## 📁 Directory Structure

```
specs/
├── YYYYMMDD/              # Date-based folders (e.g., 20251031/)
│   ├── 000-short-name/    # First spec of the day
│   ├── 001-another-spec/  # Second spec of the day
│   └── 002-third-spec/    # Third spec of the day
└── README.md              # This file
```

### Multi-Tier Hierarchy

- **Level 1**: `YYYYMMDD/` - Date folder (when spec design begins)
- **Level 2**: `NNN-short-name/` - Numbered spec folder within that date
  - `NNN` starts from `001` within each date
  - `short-name` is a brief, hyphenated identifier (e.g., `database-architecture`)

### Example

```
specs/
├── 20251031/
│   ├── 001-database-architecture/
│   │   ├── design.md
│   │   └── implementation.md
│   ├── 002-project-hierarchy/
│   │   └── README.md
│   └── 003-api-refactor/
│       ├── design.md
│       └── checklist.md
└── 20251101/
    └── 001-auth-system/
        └── design.md
```

## 🛠️ Utility Scripts

Use these scripts to manage specs efficiently:

### Create New Spec

```bash
# Create a new spec (auto-increments NNN within today's date)
pnpm spec create "short-name" "Optional Title"

# Example
pnpm spec create "database-architecture" "Database Architecture Design"
# Creates: specs/20251031/001-database-architecture/
```

### List Active Specs

```bash
# List all non-archived specs
pnpm spec list

# List specs for a specific date
pnpm spec list 20251031
```

### Archive Completed Spec

```bash
# Archive a spec to specs/archive/YYYYMMDD/NNN-name/
pnpm spec archive 20251031 001-database-architecture

# Or archive an entire date folder
pnpm spec archive 20251031
```

### Show Help

```bash
# Display usage information
pnpm spec
```

## 📝 Spec Content Guidelines

### Recommended Document Structure

While not mandatory, consider including:

- `design.md` - Full technical design specification
- `README.md` or `summary.md` - Quick overview and key points
- `implementation.md` or `checklist.md` - Phase-by-phase tasks
- `reference.md` - Quick reference guide for completed features
- Additional technical documents as needed

### Status Indicators

Include a clear status in your main document:

- 📅 **Planned** - Design phase, not yet started
- 🚧 **In Progress** - Currently being implemented
- ✅ **Complete** - Implementation finished
- ⏸️ **Paused** - Temporarily on hold
- ❌ **Cancelled** - Abandoned or deprioritized

### Example Document Header

```markdown
# Database Architecture Design

**Status**: ✅ Complete  
**Created**: 2025-10-31  
**Updated**: 2025-11-05  
**Spec**: `20251031/000-database-architecture`

## Overview
...
```

## 🎯 When to Create a Spec

Create a spec when:

- Starting significant features requiring design/planning (>2 days work)
- Making architectural decisions that affect multiple components
- Implementing complex features that need documentation
- Planning breaking changes or major refactors

**Don't create specs for:**

- Small bug fixes or minor tweaks
- Routine maintenance tasks
- Simple one-file changes

## 🔄 Workflow Integration

### For AI Agents

When starting work on a significant feature:

```typescript
// 1. Check if a spec exists
// Browse specs/ directory or use grep_search

// 2. If no spec exists and work is significant, create one
// Use pnpm spec:create or create folder manually

// 3. Document design decisions in the spec as you work

// 4. Update spec status when work completes

// 5. Archive spec when project phase is done (optional)
```

### For Human Developers

1. **Planning**: Create spec with `pnpm spec:create`
2. **Design**: Write design documents in the spec folder
3. **Implementation**: Reference spec during development
4. **Completion**: Update status to ✅ Complete
5. **Archive**: Move to archive when project phase ends (optional)

## 📚 Historical Context

Prior to November 2025, specifications lived in `docs/dev/YYYYMMDD-feature-name/`. The new multi-tier structure (`YYYYMMDD/NNN-name/`) provides:

- Better organization when multiple specs start on the same day
- Clearer chronological ordering
- Easier automation and tooling
- Simplified directory structure

---

**See Also**: 
- [AGENTS.md](/AGENTS.md) - AI agent guidelines and SOP
- [.github/instructions/all.instructions.md](/.github/instructions/all.instructions.md) - Comprehensive patterns
