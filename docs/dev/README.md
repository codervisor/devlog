# Development Documentation

This directory contains feature design documents organized by date and feature name.

## Structure

Each feature gets its own folder with the format: `YYYYMMDD-feature-name/`

The date represents when the feature design was started or last significantly updated.

## Current Features

Each feature folder contains its own documentation. Browse the dated folders to see available features and their design documents.

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
