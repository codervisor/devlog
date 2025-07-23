# Pre-commit Hooks Documentation

## Overview

This project uses automated pre-commit validation to catch common issues before they reach the repository. The setup includes code formatting, import pattern validation, and architectural consistency checks.

## Components

### 1. Custom Import Validation (`scripts/validate-imports.js`)

Enforces our ESM import patterns:
- **Required .js extensions** for relative imports
- **No @/ self-referencing** outside of Next.js web package
- **Cross-package validation** to prevent deep relative paths

### 2. Git Hooks (Husky + lint-staged)

Pre-commit pipeline:
1. **Prettier formatting** on staged files
2. **Import pattern validation** across all packages
3. **Exit on error** to prevent problematic commits

## Available Scripts

```bash
# Manual validation commands
pnpm lint           # Run ESLint on all packages
pnpm lint:fix       # Run ESLint with auto-fixing
pnpm format         # Format all files with Prettier
pnpm validate       # Run import pattern validation
pnpm detect-migration # Automatic migration need detection
pnpm pre-commit     # Test the full pre-commit pipeline

# Development workflow
pnpm dev:web        # Start development with format checking
pnpm build          # Build all packages (validates compilation)
```

## Development Workflow

### Automatic Validation

When you commit code, the pre-commit hook automatically:
1. Formats staged files with Prettier
2. Validates import patterns
3. Blocks commit if issues are found

### Manual Validation

Before committing large changes:
```bash
# Check import patterns
pnpm validate

# Format all files
pnpm format

# Test pre-commit pipeline
pnpm pre-commit
```

## Common Issues & Solutions

### Import Pattern Violations

**Problem**: `Relative import missing .js extension`
```typescript
import { DevlogEntry } from '../types';  // ❌ Missing .js
```

**Solution**: Add .js extension or use index.js
```typescript
import { DevlogEntry } from '../types/index.js';  // ✅ Correct
```

**Problem**: `Avoid self-referencing @/ alias`
```typescript
import { DevlogEntry } from '@/types';  // ❌ Ambiguous in core package
```

**Solution**: Use relative imports within same package
```typescript
import { DevlogEntry } from '../types/index.js';  // ✅ Correct
```

### ESLint Issues

Most ESLint issues can be auto-fixed:
```bash
pnpm lint:fix
```

For persistent issues, check:
1. **TypeScript compilation** - `pnpm build`
2. **Unused variables** - Remove or prefix with `_`
3. **any types** - Use specific types when possible

### **Migration Need Detection**

**Problem**: Implicit migration detection
```bash
# Changed a core manager class but forgot about dependent packages
pnpm detect-migration  # ❌ Shows cross-package usage and migration needs
```

**Solution**: Automatic detection of migration triggers
```bash
# Before making changes to core architecture:
pnpm detect-migration  # ✅ Proactive check for recent changes

# After making core changes:
pnpm detect-migration  # ✅ Detects cross-package impacts automatically
```

## Setup for New Developers

The pre-commit hooks are automatically installed when you run:
```bash
pnpm install
```

If hooks aren't working:
```bash
# Reinstall Husky
npx husky install

# Make pre-commit executable
chmod +x .husky/pre-commit
```

## Configuration Files

- **`.husky/pre-commit`** - Git hook configuration
- **`scripts/validate-imports.js`** - Custom import validation
- **`package.json`** - lint-staged configuration

## Benefits

1. **Consistency**: Automatic code formatting
2. **Quality**: Catches architectural issues early
3. **Performance**: Only checks staged files
4. **Learning**: Clear error messages with suggestions

## Future Enhancements

Potential additions based on needs:
- **Dependency consistency** checks between packages
- **Test coverage** requirements for changed files
- **Commit message** format validation
- **Bundle size** impact analysis
