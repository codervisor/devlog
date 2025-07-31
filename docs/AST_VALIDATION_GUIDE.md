# AST-based Validation Suite

This comprehensive validation suite uses Abstract Syntax Tree (AST) analysis to enforce code quality standards across all packages in the devlog monorepo. It helps AI agents and developers maintain consistent, high-quality code by catching issues early.

## 🎯 Overview

The validation suite includes 5 specialized AST-based validation scripts that analyze TypeScript code for:

- **TypeScript Best Practices** - Type safety, async patterns, error handling
- **Architecture Patterns** - Manager classes, interfaces, service layers  
- **Testing Standards** - Test structure, isolation, async patterns
- **Security & Performance** - Security vulnerabilities, performance anti-patterns
- **Import Patterns** - ESM imports, cross-package dependencies

## 🚀 Quick Start

### Run All Validations
```bash
npm run validate
# or
node scripts/validate-all-ast.js
```

### Run Specific Validation
```bash
npm run validate:typescript
npm run validate:architecture  
npm run validate:testing
npm run validate:security
npm run validate:imports
```

### Quick Mode (Skip Build/Type Checks)
```bash
npm run validate:quick
# or
node scripts/validate-all-ast.js --quick
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm run validate` | Run complete validation suite |
| `npm run validate:quick` | Quick validation (no build/types) |
| `npm run validate:list` | List all available validations |
| `npm run validate:typescript` | TypeScript best practices |
| `npm run validate:architecture` | Architecture patterns |
| `npm run validate:testing` | Testing standards |
| `npm run validate:security` | Security & performance |
| `npm run validate:imports` | Import patterns |

### Orchestrator Options

```bash
# Show help
node scripts/validate-all-ast.js --help

# List available scripts
node scripts/validate-all-ast.js --list

# Run specific script
node scripts/validate-all-ast.js --script typescript

# Skip build validation (faster)
node scripts/validate-all-ast.js --no-build

# Skip TypeScript compilation check
node scripts/validate-all-ast.js --no-types

# Quick mode (skip both)
node scripts/validate-all-ast.js --quick
```

## 🔍 Validation Details

### 1. TypeScript Best Practices (`validate-typescript-best-practices-ast.js`)

**Checks for:**
- ❌ Usage of `any` type (warnings)
- ❌ Non-null assertion operator overuse
- ❌ Unsafe type assertions
- ❌ Missing await on async methods
- ❌ Async functions without error handling
- ❌ Empty catch blocks (errors)
- ❌ Throwing strings instead of Error objects
- ❌ Missing JSDoc on exported APIs
- ❌ Unconstrained generic types

**Example Issues Caught:**
```typescript
// ❌ Will warn about 'any' usage
function process(data: any) { ... }

// ❌ Will error on empty catch
try { ... } catch (e) { }

// ❌ Will warn about missing await
async function example() {
  manager.initialize(); // Should be: await manager.initialize()
}
```

### 2. Architecture Patterns (`validate-architecture-patterns-ast.js`)

**Checks for:**
- ❌ Manager classes missing `initialize()`/`dispose()` methods (errors)
- ❌ Manager methods should be async
- ❌ Missing dependency injection in constructors
- ❌ Interfaces not prefixed with 'I'
- ❌ Service classes with mutable state
- ❌ Storage providers not extending base classes
- ❌ Package-specific patterns (MCP tools, React components, etc.)

**Example Issues Caught:**
```typescript
// ❌ Manager missing required methods
export class UserManager {
  constructor(private storage: Storage) {} // ✅ Has DI
  // ❌ Missing initialize() and dispose() methods
}

// ❌ Interface naming
interface StorageProvider { ... } // Should be: IStorageProvider
```

### 3. Testing Standards (`validate-testing-standards-ast.js`)

**Checks for:**
- ❌ Test files missing testing framework imports (errors)
- ❌ Tests without assertions
- ❌ Missing test isolation (cleanup in afterEach)
- ❌ Async tests without proper await patterns
- ❌ File system operations without temporary directories
- ❌ Mock usage without cleanup
- ❌ Poor test naming (should start with "should")

**Example Issues Caught:**
```typescript
// ❌ Missing framework import
describe('Component', () => { ... }); // Missing: import { describe, it } from 'vitest'

// ❌ Test without assertion
it('should work', async () => {
  await component.doSomething();
  // ❌ No expect() call
});

// ❌ File operations without cleanup
beforeEach(() => {
  fs.writeFileSync('test.txt', 'data'); // ❌ Should use temp directories
});
```

### 4. Security & Performance (`validate-security-performance-ast.js`)

**Security Checks:**
- ❌ XSS vulnerabilities (`innerHTML` usage) (errors)
- ❌ `eval()` usage (errors)
- ❌ Hardcoded secrets/credentials (errors)
- ❌ SQL injection patterns (errors)
- ❌ Dangerous regex patterns (ReDoS) (warnings)
- ❌ Path traversal vulnerabilities (warnings)

**Performance Checks:**
- ❌ Synchronous blocking operations (warnings)
- ❌ Inefficient nested loops (warnings)
- ❌ Memory leaks (timer cleanup, event listeners) (warnings)
- ❌ Inefficient array operations (warnings)
- ❌ Large object literals (warnings)

**Example Issues Caught:**
```typescript
// ❌ Security: XSS vulnerability
element.innerHTML = userInput; // Should sanitize or use textContent

// ❌ Security: Hardcoded secret
const apiKey = "sk-1234567890abcdef"; // Should use environment variables

// ❌ Performance: Sync operation
const data = fs.readFileSync('file.txt'); // Should use async version

// ❌ Performance: Timer leak
setInterval(() => { ... }, 1000); // Missing clearInterval in cleanup
```

### 5. Import Patterns (`validate-imports.js`)

**Checks for:**
- ❌ Missing `.js` extensions on relative imports (errors)
- ❌ Self-referencing `@/` aliases (outside web package) (errors)
- ❌ Cross-package relative imports (errors)
- ❌ Invalid package names in cross-package imports (errors)

**Example Issues Caught:**
```typescript
// ❌ Missing .js extension
import { Helper } from './helper'; // Should be: './helper.js'

// ❌ Cross-package relative import
import { CoreType } from '../../core/src/types'; // Should be: '@devlog/core'

// ❌ Self-referencing alias (outside web package)
import { Utils } from '@/utils'; // Should use relative: './utils.js'
```

## 📊 Output Format

The validation scripts provide detailed, actionable feedback:

```
❌ Found 2 TypeScript best practice errors:

📁 packages/core/src/manager.ts:45 [EMPTY_CATCH_BLOCK]
   Empty catch block - errors should be handled
   💡 Add error logging, re-throwing, or proper error handling

📁 packages/web/components/Button.tsx:12 [MISSING_JSDOC]
   Exported function "Button" missing JSDoc documentation
   💡 Add JSDoc comments for public API documentation
```

## 🎯 Exit Codes

- **0**: All validations passed (or warnings only)
- **1**: Critical errors found (must be fixed)

## 🛠️ Integration

### Pre-commit Hook
The validation is integrated into the pre-commit hook:
```json
"pre-commit": "lint-staged && node scripts/validate-imports.js"
```

### CI/CD Integration
Add to your CI pipeline:
```yaml
- name: Validate Code Quality
  run: npm run validate
```

### Development Workflow
```bash
# Before committing
npm run validate:quick

# Full validation before PR
npm run validate

# Fix specific issues
npm run validate:typescript
```

## 📈 Benefits

### For AI Agents
- **Consistent Patterns**: Enforces architectural patterns AI can rely on
- **Early Error Detection**: Catches issues before they compound
- **Code Quality Gates**: Prevents degradation during automated changes
- **Contextual Guidance**: Provides specific suggestions for fixes

### For Developers  
- **Code Reviews**: Automated checks reduce manual review overhead
- **Learning Tool**: Warnings teach best practices
- **Refactoring Safety**: Catches regressions during code changes
- **Documentation**: Enforces API documentation standards

### For Project Maintenance
- **Consistency**: Uniform code style across all packages
- **Security**: Proactive security vulnerability detection
- **Performance**: Early performance anti-pattern detection
- **Scalability**: Maintains quality as codebase grows

## 🔧 Customization

### Adding New Validations

1. Create new validation script in `scripts/` directory
2. Follow naming pattern: `validate-{name}-ast.js`
3. Export main function for orchestrator integration
4. Add to `package.json` scripts section

### Modifying Validation Rules

Each validation script contains clearly marked sections for different types of checks. Modify the validation logic in the specific `validate*` functions within each script.

### Package-Specific Rules

The architecture validation includes package-specific checks:
- **Core**: Manager exports, type exports
- **MCP**: Tool patterns, error handling  
- **Web**: React patterns, Next.js routes
- **AI**: Parser implementations

## 🎁 Summary

This AST-based validation suite provides comprehensive code quality enforcement that helps maintain a high-quality, consistent codebase. It's designed to work seamlessly with AI agents while providing valuable feedback to human developers. The modular design allows for easy extension and customization as the project evolves.