# API Response Standardization Validation (AST-Based)

This document describes the **AST-based validation system** that enforces the API response standardization rules across the devlog project. The validation uses TypeScript's compiler API for accurate, robust code analysis instead of fragile text pattern matching.

## Overview

The validation system consists of multiple AST-powered scripts that check for compliance with our API response standardization standards. These validations run automatically on every commit via Husky pre-commit hooks, ensuring code quality and consistency.

**Key Benefits of AST-Based Validation:**
- ✅ **Accurate Analysis** - No false positives from string matching
- ✅ **Type-Aware** - Understands TypeScript code structure
- ✅ **Context-Sensitive** - Knows the difference between API routes and frontend code
- ✅ **Robust** - Handles complex code patterns and edge cases
- ✅ **Fast** - Efficient parsing with TypeScript compiler API

## AST-Based Analysis Advantages

### Accuracy Over Text Matching

Traditional linting tools use regular expressions and text patterns, which are:
- **Fragile** - Break with code formatting changes
- **Context-Unaware** - Can't distinguish between different code contexts
- **False Positive Prone** - Match patterns in comments, strings, etc.

Our AST-based validation:
- **Parses TypeScript** - Uses the same parser as the TypeScript compiler
- **Understands Code Structure** - Knows the difference between imports, function calls, object properties
- **Context-Sensitive** - Treats API routes differently from frontend code
- **Type-Aware** - Can analyze TypeScript types and interfaces

### Performance Benefits

- **Single Parse** - Analyzes entire codebase in one TypeScript compilation
- **Efficient Traversal** - AST traversal is faster than multiple regex operations
- **Parallel Processing** - Can analyze multiple files simultaneously
- **Caching** - TypeScript compiler can cache parsed results

### Examples of Improved Detection

**Old Text-Based (Prone to False Positives):**
```javascript
// ❌ Would incorrectly flag this comment: "Use Response.json() here"
// ❌ Would miss this pattern: const x = Response["json"](data)
```

**New AST-Based (Accurate):**
```javascript
// ✅ Only flags actual function calls to Response.json()
// ✅ Correctly identifies object literal structures
// ✅ Understands import statements and their usage
```

## Validation Scripts

### 1. API Standardization Validation (`validate-api-standardization-ast.js`)

Uses AST analysis to validate that API endpoints and frontend code follow standardized patterns:

**API Endpoint Checks:**
- ✅ Uses `apiResponse()`, `apiError()`, `apiCollection()` utilities
- ✅ Implements `withErrorHandling()` wrapper
- ✅ Avoids manual `Response.json()` calls
- ✅ Uses standardized error codes
- ✅ Imports utilities from `api-utils.ts`

**Frontend Integration Checks:**
- ✅ Uses `ApiClient` instead of manual `fetch()`
- ✅ Handles response envelopes correctly
- ✅ Implements proper `ApiError` handling
- ✅ Avoids legacy API client patterns

**Type Definition Checks:**
- ✅ Response interfaces follow envelope format
- ✅ Error interfaces include `code` and `message`

### 2. Response Envelope Validation (`validate-response-envelopes-ast.js`)

Uses AST analysis to validate the standardized response envelope format:

**Success Response Format:**
```typescript
{
  success: true,
  data: T,
  meta: {
    timestamp: string,
    pagination?: PaginationMeta,
    requestId?: string
  }
}
```

**Error Response Format:**
```typescript
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any
  },
  meta: {
    timestamp: string,
    requestId?: string
  }
}
```

**Validation Rules:**
- ✅ All API responses use envelope format
- ✅ Success responses include `data` and `meta`
- ✅ Error responses include proper `error` structure
- ✅ Meta objects include timestamps
- ✅ Uses standardized error codes
- ✅ Frontend accesses `response.data`, `response.success`, `response.error`
- ✅ Pagination accessed via `response.meta.pagination`

### 3. Comprehensive Validation (`validate-all.js`)

Runs all validation checks plus additional quality checks:

- **Import Pattern Validation** - ESM import rules
- **API Standardization** - Response format compliance
- **Response Envelopes** - Envelope structure validation
- **TypeScript Compilation** - Type checking across packages
- **Build Validation** - Ensures code builds successfully

## Usage

### Manual Validation

```bash
# Run all validations
pnpm validate

# Run specific validations (AST-based)
pnpm validate:api          # API standardization only
pnpm validate:envelopes    # Response envelope format only
pnpm validate:imports      # Import patterns only
pnpm validate:quick        # Skip build/type checks for speed

# Use validation scripts directly (AST-based)
node scripts/validate-all.js
node scripts/validate-api-standardization-ast.js
node scripts/validate-response-envelopes-ast.js
```

### Command Line Options

```bash
# Validation script options (AST-based)
node scripts/validate-all.js --help          # Show help
node scripts/validate-all.js --api-only      # API checks only
node scripts/validate-all.js --no-build      # Skip build validation
node scripts/validate-all.js --no-types      # Skip TypeScript check
```

### Automatic Validation

Validations run automatically on:
- **Pre-commit** (via Husky) - Runs core validations
- **CI/CD Pipeline** - Runs full validation suite
- **Pull Request** - Validates changed files

## Error Types and Fixes

### API Response Format Errors

| Error Code | Description | Fix |
|------------|-------------|-----|
| `API_RESPONSE_FORMAT` | Manual Response.json() usage | Use `apiResponse()` utility |
| `API_ERROR_CODE` | Missing standardized error code | Use codes like `PROJECT_NOT_FOUND` |
| `NON_ENVELOPE_RESPONSE` | Response without envelope | Implement envelope format |
| `STATUS_WITHOUT_ERROR_ENVELOPE` | Error status without error envelope | Use `apiError()` utility |

### Frontend Integration Errors

| Error Code | Description | Fix |
|------------|-------------|-----|
| `FRONTEND_MANUAL_FETCH` | Manual fetch() calls | Use `ApiClient` class |
| `FRONTEND_MANUAL_PARSING` | Manual response parsing | Let `ApiClient` handle parsing |
| `FRONTEND_ERROR_HANDLING` | Improper error handling | Use `ApiError` methods |
| `DIRECT_RESPONSE_ACCESS` | Direct property access | Use envelope properties |

### Response Envelope Errors

| Error Code | Description | Fix |
|------------|-------------|-----|
| `SUCCESS_MISSING_META` | Success response missing meta | Include meta with timestamp |
| `ERROR_MISSING_STRUCTURE` | Error missing code/message | Include proper error structure |
| `NON_STANDARD_ERROR_CODE` | Non-standard error code | Use standardized error codes |
| `PAGINATION_ACCESS` | Incorrect pagination access | Use `response.meta.pagination` |

## Standardized Error Codes

The following error codes are recognized as standard:

- `PROJECT_NOT_FOUND` - Project does not exist
- `DEVLOG_NOT_FOUND` - Devlog entry not found
- `NOTE_NOT_FOUND` - Note not found
- `BAD_REQUEST` - Invalid request format
- `VALIDATION_FAILED` - Request validation errors
- `INTERNAL_ERROR` - Server-side errors
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `METHOD_NOT_ALLOWED` - HTTP method not supported
- `RATE_LIMITED` - Too many requests

## Configuration

### Husky Pre-commit Hook

The `.husky/pre-commit` hook runs essential validations:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running pre-commit validations..."

# Run lint-staged for efficient checking of staged files
npx lint-staged

# Run custom import pattern validation
echo "🔗 Validating import patterns..."
node scripts/validate-imports.js

# Run API response standardization validation (AST-based)
echo "📡 Validating API response standardization..."
node scripts/validate-api-standardization-ast.js

# Run response envelope format validation (AST-based)
echo "📦 Validating response envelope format..."
node scripts/validate-response-envelopes-ast.js

echo "✅ Pre-commit checks passed!"
```

### Package.json Scripts

```json
{
  "scripts": {
    "validate": "node scripts/validate-all.js",
    "validate:imports": "node scripts/validate-imports.js",
    "validate:api": "node scripts/validate-api-standardization-ast.js",
    "validate:envelopes": "node scripts/validate-response-envelopes-ast.js",
    "validate:quick": "node scripts/validate-all.js --no-build --no-types"
  }
}
```

## Best Practices

### For API Developers

1. **Use Response Utilities**
   ```typescript
   // ✅ Good
   return apiResponse(data);
   return apiError('PROJECT_NOT_FOUND', 'Project not found');
   
   // ❌ Avoid
   return Response.json({ success: true, data });
   ```

2. **Implement Error Handling**
   ```typescript
   // ✅ Good
   export const GET = withErrorHandling(async (request) => {
     // Your logic here
   });
   ```

3. **Use Standardized Error Codes**
   ```typescript
   // ✅ Good
   return apiError('VALIDATION_FAILED', 'Invalid input');
   
   // ❌ Avoid
   return apiError('invalid_input', 'Invalid input');
   ```

### For Frontend Developers

1. **Use ApiClient**
   ```typescript
   // ✅ Good
   const client = new ApiClient();
   const response = await client.get('/api/projects');
   const projects = response.data;
   
   // ❌ Avoid
   const response = await fetch('/api/projects');
   const projects = await response.json();
   ```

2. **Handle Errors Properly**
   ```typescript
   // ✅ Good
   try {
     const response = await client.get('/api/project/123');
   } catch (error) {
     if (error.isNotFound()) {
       // Handle not found
     }
   }
   ```

3. **Access Data Correctly**
   ```typescript
   // ✅ Good
   const projects = response.data;
   const pagination = response.meta.pagination;
   
   // ❌ Avoid
   const projects = response.projects;
   const pagination = response.pagination;
   ```

## Troubleshooting

### Common Issues

1. **Validation failing on valid code**
   - Check that you're using the standardized utilities
   - Ensure proper imports from `api-utils.ts`
   - Verify response envelope structure

2. **False positives in validation**
   - Some warnings are suggestions, not errors
   - Critical errors block commits, warnings don't
   - Use `--no-build` flag for faster validation during development

3. **Legacy code warnings**
   - Gradually migrate legacy patterns
   - Warnings don't block commits, only errors do
   - Use validation reports to prioritize refactoring

### Debugging Validation

```bash
# Run specific validation for debugging (AST-based)
node scripts/validate-api-standardization-ast.js --api-only

# Check specific files (AST understands file context)
node scripts/validate-response-envelopes-ast.js 2>&1 | grep "specific-file.ts"

# TypeScript compilation errors (if AST parsing fails)
pnpm --filter @codervisor/devlog-web tsc --noEmit
```

### AST Validation Debugging

The AST-based validation provides better error reporting:

```bash
# When AST parsing fails, you'll see:
⚠️  Could not parse /path/to/file.ts
⚠️  Skipping problematic node in file.ts: SyntaxError details

# This indicates TypeScript compilation issues that should be fixed first
```

## Contributing

When adding new validation rules:

1. **Add to appropriate script** - API, envelope, or import validation
2. **Include error codes** - Use descriptive, consistent codes
3. **Provide helpful suggestions** - Guide developers to solutions
4. **Test validation logic** - Ensure it catches real issues
5. **Update documentation** - Add new rules to this document

### Validation Rule Categories

- **ERRORS** - Block commits, must be fixed
- **WARNINGS** - Suggestions for improvement, don't block commits
- **INFO** - Informational messages, no action required

## Future Enhancements

Planned improvements to the validation system:

- **Performance optimization** - Incremental validation for changed files only
- **Configuration files** - Allow project-specific validation rules  
- **IDE integration** - Real-time validation in development via Language Server Protocol
- **Automated fixes** - Suggest or apply automatic fixes using AST transformations
- **Custom rules** - Allow teams to add project-specific AST-based validations
- **Rule severity levels** - Configure which rules are errors vs warnings
- **Validation metrics** - Track code quality improvements over time

## Legacy Scripts

The following legacy text-based scripts are still available but deprecated:
- `validate-api-standardization.js` - Use `validate-api-standardization-ast.js` instead
- `validate-response-envelopes.js` - Use `validate-response-envelopes-ast.js` instead

These will be removed in a future version once AST-based validation is fully validated.
