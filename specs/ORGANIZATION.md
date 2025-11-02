# Specs Organization Guide

> Quick reference for navigating and maintaining the specs directory

## 📊 Current Status (Updated: Nov 2, 2025)

Use `lspec board` to see the Kanban-style view:

- **Planned**: 1 spec
- **In Progress**: 3 specs
- **Complete**: 8 specs
- **Archived**: 4+ specs

## 🎯 Active Development Focus

### In Progress

1. **[20251102/001-test-infrastructure-improvements](20251102/001-test-infrastructure-improvements/)** - Testing infrastructure enhancements
2. **[20251031/002-mvp-launch-plan](20251031/002-mvp-launch-plan/)** - MVP launch execution (Week 4, 70% complete)
3. **[20251021/001-ai-agent-observability](20251021/001-ai-agent-observability/)** - Core observability platform features

### Planned

1. **[20251101/001-project-folder-restructure](20251101/001-project-folder-restructure/)** - Project organization improvements

## 📁 File Naming Conventions

All specs now follow consistent patterns:

### Standard Files

- `README.md` - Main spec overview with frontmatter
- `design.md` - Detailed technical design
- `implementation.md` - Consolidated implementation notes
- `quick-reference.md` - Quick lookup guide

### Naming Style

- ✅ **kebab-case**: `implementation-summary.md`, `quick-reference.md`
- ❌ **SCREAMING_SNAKE**: ~~`IMPLEMENTATION_SUMMARY.md`~~
- ❌ **Redundant prefixes**: ~~`ai-agent-observability-design.md`~~ (just `design.md`)

## 📝 Frontmatter Requirements

Every spec's README.md must include:

```yaml
---
status: draft|planned|in-progress|complete|blocked|cancelled
created: YYYY-MM-DD
tags: [tag1, tag2, tag3]
priority: low|medium|high
assignee: username (optional)
---
```

## 🗂️ Spec Structure by Type

### Large Multi-Phase Specs

Example: `20251021/001-ai-agent-observability/`

```
├── README.md (overview + frontmatter)
├── design.md (full technical design)
├── implementation.md (phase completion notes)
├── quick-reference.md (lookup guide)
├── collector-design.md (component-specific)
├── collector-progress.md (tracking)
└── next-steps.md (future work)
```

### Launch/Roadmap Specs

Example: `20251031/002-mvp-launch-plan/`

```
├── README.md (overview + timeline)
├── implementation.md (weekly progress)
├── database-schema.md (technical details)
├── launch-checklist.md (tasks)
├── week1-foundation.md (phase plans)
├── week2-collector.md
├── week3-backend.md
└── week4-launch.md
```

### Architectural Specs

Example: `20251031/001-database-architecture/`

```
├── README.md (overview)
├── implementation-summary.md (high-level)
├── phase2-implementation.md (detailed)
├── phase3-implementation.md
└── phase3-security-summary.md
```

## 🔍 Discovery Commands

```bash
# View Kanban board
lspec board

# Show statistics
lspec stats

# List all specs
lspec list

# Search specs
lspec search "database"

# Find by tag
lspec list --tag=architecture

# Show dependencies
lspec deps <spec-path>
```

## 🏗️ Maintenance Tasks

### Creating New Specs

```bash
# Auto-creates in current date with next number
lspec create "short-name" "Optional Title"
```

### Updating Status

```bash
# Update spec metadata
lspec update <spec-path> --status in-progress
lspec update <spec-path> --priority high
lspec update <spec-path> --assignee yourname
```

### Archiving Completed Work

```bash
# Move to archived/ directory
lspec archive <spec-path>
```

## 📋 Best Practices

### Do's ✅

- Use `lspec board` before starting new work
- Update spec status as work progresses
- Keep README.md concise with links to detailed docs
- Use consistent kebab-case naming
- Archive completed specs periodically

### Don'ts ❌

- Don't create specs for trivial changes
- Don't duplicate spec name in file names
- Don't use ALL_CAPS or SCREAMING_SNAKE_CASE
- Don't leave specs in stale "in-progress" state
- Don't create specs without frontmatter

## 🔗 Related Documentation

- [specs/README.md](README.md) - Full specs directory guide
- [AGENTS.md](../AGENTS.md) - AI agent development guidelines
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Project contribution guide

---

**Last Updated**: November 2, 2025  
**Maintained by**: Development Team
