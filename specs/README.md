# Specifications (Specs)

This directory contains **specifications** for features, designs, and technical decisions following the **LeanSpec** methodology outlined in [AGENTS.md](../AGENTS.md).

## 📁 Directory Structure

```
specs/
├── 001-short-name/        # First spec
├── 002-another-spec/      # Second spec
├── 003-third-spec/        # Third spec
└── README.md              # This file
```

### Flat Structure

- **Format**: `NNN-short-name/` - Numbered spec folder with descriptive name
  - `NNN` is a sequential counter (001, 002, 003...)
  - `short-name` is a brief, hyphenated identifier (e.g., `database-architecture`)
  - Created date is stored in frontmatter, not in directory structure

### Example

```
specs/
├── 001-ai-evaluation-system/
│   └── README.md
├── 002-ai-agent-observability/
│   ├── README.md
│   ├── design.md
│   └── implementation.md
├── 003-codebase-reorganization/
│   └── README.md
└── 007-database-architecture/
    ├── README.md
    ├── implementation-summary.md
    └── phase2-implementation.md
```

## 🛠️ Managing Specs

### Creating New Specs

```bash
# Create a new spec (auto-increments number)
lspec create "your-spec-name" --priority high --tags feature,api

# Example
lspec create "user-authentication" --priority high --tags auth,security
# Creates: specs/014-user-authentication/
```

### Discovery & Navigation

```bash
# View Kanban board (recommended starting point)
lspec board

# Show statistics and velocity
lspec stats

# List all specs
lspec list

# Filter by status
lspec list --status in-progress

# Filter by tag
lspec list --tag architecture

# Full-text search
lspec search "database migration"

# View a spec
lspec view 007

# Open in editor
lspec open 007
```

### Updating Specs

```bash
# Update spec metadata
lspec update 014 --status in-progress
lspec update 014 --priority high
lspec update 014 --assignee yourname

# Archive completed spec
lspec archive 014
```

## 📝 Spec Content Guidelines

### Required Frontmatter

Every spec's README.md must include YAML frontmatter:

```yaml
---
status: planned|in-progress|complete|archived
created: YYYY-MM-DD
tags: [tag1, tag2]
priority: low|medium|high
assignee: username (optional)
---
```

**Status Values:**

- `planned` 🗓️ - Design phase, not yet started
- `in-progress` ⏳ - Currently being implemented
- `complete` ✅ - Implementation finished
- `archived` 📦 - Moved to archive (use `lspec archive` instead)

### Recommended Document Structure

While not mandatory, consider including:

- `README.md` - Overview with frontmatter and key points
- `design.md` - Full technical design specification
- `implementation.md` - Phase-by-phase tasks and progress
- `quick-reference.md` - Quick reference guide for completed features
- Additional technical documents as needed

### Example Document Header

```markdown
---
status: complete
created: 2025-10-31
tags: [architecture, database]
priority: high
---

# Database Architecture Design

**Updated**: 2025-11-05  
**Spec**: `007-database-architecture`

## Overview

...
```

## 🎯 When to Create a Spec

Create a spec when:

- Starting significant features requiring design/planning (>2 days work)
- Making architectural decisions that affect multiple components
- Implementing complex features that need documentation
- Planning breaking changes or major refactors
- Design decisions needing team alignment

**Don't create specs for:**

- Small bug fixes or minor tweaks
- Routine maintenance tasks
- Simple one-file changes
- Self-explanatory refactors

## 🔄 Workflow Integration

### For AI Agents

When starting work on a significant feature:

```typescript
// 1. Check if a spec exists - use lspec search or lspec list
// 2. If no spec exists and work is significant:
//    - Create with: lspec create "spec-name" --priority high
// 3. Document design decisions in the spec as you work
// 4. Update status: lspec update NNN --status in-progress
// 5. Mark complete: lspec update NNN --status complete
```

### For Human Developers

1. **Discovery**: Run `lspec board` to see current state
2. **Planning**: Create spec with `lspec create`
3. **Design**: Write design documents with frontmatter in README.md
4. **Implementation**: Reference spec during development, update with `lspec update`
5. **Completion**: Mark complete with `lspec update NNN --status complete`
6. **Archive**: Move to archive with `lspec archive NNN` when project phase ends

## 📚 Historical Context

**Evolution**:

- **Pre-Nov 2025**: Specs lived in `docs/dev/YYYYMMDD-feature-name/`
- **Nov 2025**: Migrated to multi-tier structure `YYYYMMDD/NNN-name/`
- **Nov 10, 2025**: Flattened to `NNN-name/` for simplicity

The flat structure provides:

- Simpler organization and discovery
- No date-based hierarchy complexity
- Created dates stored in frontmatter
- Sequential numbering shows creation order

---

**See Also**:

- [AGENTS.md](../AGENTS.md) - AI agent guidelines including LeanSpec methodology
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Project contribution guide
