# Scripts Directory

This directory contains all development and maintenance scripts for the devlog project, organized into logical categories.

## 📁 Folder Structure

```
scripts/
├── run.js                    # Main script orchestrator
├── validation/               # Code quality and standardization
│   ├── validate-all.js      # Comprehensive validation suite
│   ├── validate-imports.js  # Import pattern validation
│   ├── validate-api-standardization-ast.js    # API standardization (AST-based)
│   └── validate-response-envelopes-ast.js     # Response envelope validation (AST-based)
└── database/                 # Database management
    └── init-db.sql          # Database initialization script
```

## 🚀 Usage

### Using the Script Orchestrator

The `run.js` script provides a unified interface to all project scripts:

```bash
# General syntax
node scripts/run.js <category> <script> [options]

# Show help and available scripts
node scripts/run.js --help
```

### Validation Scripts

```bash
# Run all validation checks
node scripts/run.js validation all

# Run specific validations
node scripts/run.js validation imports
node scripts/run.js validation api
node scripts/run.js validation envelopes

# Quick validation (skip build/type checks)
node scripts/run.js validation all --no-build --no-types
```

### Development Scripts

```bash
# Check development server status
node scripts/run.js development dev-check pnpm dev:web
```

### Package.json Shortcuts

For convenience, common scripts are available via package.json:

```bash
# Validation shortcuts
pnpm validate                 # validation all
pnpm validate:api            # validation api
pnpm validate:envelopes      # validation envelopes
pnpm validate:imports        # validation imports
pnpm validate:quick          # validation all --no-build --no-types
```

## 📋 Script Categories

### 🔍 Validation Scripts

**Purpose**: Enforce code quality and standardization rules

- **`validate-all.js`** - Comprehensive validation including imports, API patterns, build checks
- **`validate-imports.js`** - ESM import pattern validation for TypeScript files
- **`validate-api-standardization-ast.js`** - AST-based API endpoint and frontend pattern validation
- **`validate-response-envelopes-ast.js`** - AST-based response envelope format validation

**Features**:
- AST-based analysis for accuracy
- Context-aware validation (API vs frontend code)
- Husky pre-commit integration
- Detailed error reporting with suggestions

### ️Database Scripts

**Purpose**: Database management and initialization

- **`init-db.sql`** - Database schema initialization

**Features**:
- Schema setup
- Initial data population

## 🔧 Adding New Scripts

### 1. Choose the Right Category

- **validation/** - Code quality, linting, standardization
- **development/** - Dev workflow, build tools, utilities
- **database/** - Schema, data management
- **Create new category** if none fit

### 2. Add to Script Orchestrator

Update `scripts/run.js` to include your new script:

```javascript
const SCRIPT_CATEGORIES = {
  // existing categories...
  newCategory: {
    description: 'Description of new category',
    scripts: {
      'script-name': 'script-file.js'
    }
  }
};
```

### 3. Update Package.json (Optional)

Add shortcuts to `package.json` for frequently used scripts:

```json
{
  "scripts": {
    "script-name": "node scripts/run.js category script-name"
  }
}
```

### 4. Update Documentation

- Add script documentation to this README
- Update relevant guides in `docs/guides/`
- Include usage examples

## 🎯 Best Practices

### Script Development

1. **Use proper shebangs** - `#!/usr/bin/env node` for Node.js scripts
2. **Make scripts executable** - `chmod +x script-name.js`
3. **Handle errors gracefully** - Proper exit codes and error messages
4. **Include help text** - `--help` option for complex scripts
5. **Use consistent naming** - Clear, descriptive script names

### Error Handling

```javascript
// Good error handling example
try {
  // Script logic
} catch (error) {
  console.error(`❌ Script failed: ${error.message}`);
  process.exit(1);
}
```

### Documentation

- Include header comments explaining script purpose
- Document command line options
- Provide usage examples
- Maintain this README when adding scripts

## 🔄 Migration from Old Structure

**Before**: All scripts in `scripts/` root
**After**: Organized into categorized folders

**Breaking Changes**: None - package.json scripts maintain backwards compatibility

**Deprecated Paths**: Direct script paths are deprecated but still work:
- `scripts/validate-all.js` → `scripts/validation/validate-all.js`
- Use `scripts/run.js` or package.json shortcuts instead

## 🧪 Testing Scripts

Test scripts in development:

```bash
# Test validation
node scripts/run.js validation all --no-build

# Test with specific options
node scripts/run.js validation api --help

# Test package.json shortcuts
pnpm validate:quick
```
