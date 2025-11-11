# API Test Suite Documentation

## Overview

This document describes the comprehensive test suite for the Devlog Web API, designed to ensure our API route overhaul maintains reliability and prevents regressions.

## Test Architecture

### 🚀 **Integration Tests** (`tests/api-integration.test.ts`)

- **End-to-end testing** against actual API endpoints
- **Real HTTP requests** with proper error handling
- **Environment-specific** - requires running API server
- **Opt-in execution** - only runs when explicitly enabled

## Running Tests

### Unit Tests (Always Safe)

```bash
# Run all unit tests
pnpm --filter @codervisor/devlog-web test

# Run tests in watch mode
pnpm --filter @codervisor/devlog-web test:watch

# Run with coverage report
pnpm --filter @codervisor/devlog-web test:coverage

# Run with UI (interactive)
pnpm --filter @codervisor/devlog-web test:ui
```

### Integration Tests (Requires Running Server)

```bash
# Start development server first
docker compose up web-dev -d --wait

# Run integration tests
pnpm --filter @codervisor/devlog-web test:integration

# Or with environment variables
RUN_INTEGRATION_TESTS=true TEST_API_URL=http://localhost:3200/api pnpm --filter @codervisor/devlog-web test:integration
```

## Test Coverage

### ✅ **Unit Test Coverage**

#### **RouteParams Utilities**

- ✅ Valid numeric ID parsing
- ✅ Invalid ID rejection (strings, negatives, zero)
- ✅ Multiple parameter parsing (project + devlog IDs)
- ✅ Error response generation

#### **ServiceHelper Utilities**

- ✅ Project existence validation
- ✅ Devlog service initialization
- ✅ Devlog existence validation
- ✅ Service error handling

#### **Error Response Patterns**

- ✅ HTTP status codes (400, 404, 500, etc.)
- ✅ Consistent error message format
- ✅ Custom error messages

#### **Success Response Patterns**

- ✅ Standard success responses
- ✅ Created responses (201)
- ✅ No content responses (204)

#### **Error Handling Wrapper**

- ✅ Successful request passthrough
- ✅ Exception catching and conversion
- ✅ Specific error type handling ("not found", "Invalid")
- ✅ Non-Error object handling

#### **Route Handler Integration**

- ✅ Project route patterns
- ✅ Devlog route patterns
- ✅ Batch operation patterns
- ✅ Parameter validation integration
- ✅ Service error propagation

### ✅ **Integration Test Coverage**

#### **Health & Infrastructure**

- ✅ Health check endpoint
- ✅ Server responsiveness

#### **Project Operations**

- ✅ GET project details
- ✅ Parameter validation (invalid/nonexistent IDs)
- ✅ Error response formats

#### **Devlog Operations**

- ✅ List devlogs with pagination
- ✅ Retrieve individual devlogs
- ✅ Status filtering
- ✅ Search functionality
- ✅ Parameter validation

#### **Statistics Operations**

- ✅ Overview statistics
- ✅ Time series statistics
- ✅ Query parameter handling
- ✅ Parameter validation

#### **Batch Operations**

- ✅ Batch update devlogs
- ✅ Batch add notes
- ✅ Request body validation
- ✅ Error handling

#### **Response Consistency**

- ✅ Project object structure
- ✅ Devlog object structure
- ✅ Pagination structure
- ✅ Error format consistency

## Test Configuration

### Environment Variables

```bash
# Integration test configuration
RUN_INTEGRATION_TESTS=true    # Enable integration tests
TEST_API_URL=http://localhost:3201/api  # API base URL
TEST_PROJECT_ID=1             # Project ID for testing

# Test database (unit tests)
DATABASE_URL=sqlite::memory:   # In-memory database for unit tests
NODE_ENV=test                 # Test environment marker
```

## Test Safety Features

### 🛡️ **Production Protection**

- **Unit tests**: Never touch real data - fully mocked
- **Integration tests**: Opt-in only with explicit environment variable
- **Database isolation**: Uses separate test database/memory database
- **Network isolation**: Configurable API endpoint URLs

### 🔒 **Data Safety**

- **No destructive operations** in integration tests
- **Read-only operations** where possible
- **Transactional test data** (if implemented)
- **Cleanup procedures** for test artifacts

### ⚡ **Performance Safety**

- **Parallel execution** safe with proper test isolation
- **Fast unit tests** (< 1 second total runtime)
- **Limited integration test scope** to prevent timeout issues
- **Configurable timeouts** for different test types

## Test Maintenance

### Adding New Tests

1. **Integration tests**: Add to `tests/api-integration.test.ts` with safety guards
2. **New utilities**: Mock in test setup and add comprehensive unit tests
3. **New endpoints**: Follow existing patterns for parameter validation

### Test Data Management

- **Use existing test data** where possible
- **Create minimal test fixtures** for complex scenarios
- **Clean up test artifacts** after integration tests
- **Use deterministic test data** to prevent flaky tests

### CI/CD Integration

```yaml
# Example GitHub Actions configuration
- name: Run Unit Tests
  run: pnpm --filter @codervisor/devlog-web test

- name: Run Integration Tests
  env:
    RUN_INTEGRATION_TESTS: true
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
  run: pnpm --filter @codervisor/devlog-web test:integration
```

## Troubleshooting

### Common Issues

1. **Integration tests skipped**: Ensure `RUN_INTEGRATION_TESTS=true`
2. **API connection failures**: Verify development server is running
3. **Mock import errors**: Check that `@codervisor/devlog-core` is properly mocked
4. **Type errors**: Ensure `@types/node` and proper TypeScript configuration

### Debugging Tests

```bash
# Run specific test file
pnpm --filter @codervisor/devlog-web test tests/api.test.ts

# Run specific test case
pnpm --filter @codervisor/devlog-web test -t "should parse valid numeric project ID"

# Run with verbose output
pnpm --filter @codervisor/devlog-web test --reporter=verbose

# Run with debug information
DEBUG=* pnpm --filter @codervisor/devlog-web test
```

## Test Metrics

### Success Criteria

- **Unit tests**: 100% pass rate required
- **Coverage**: >80% line coverage on API utilities
- **Performance**: Unit tests complete in <5 seconds
- **Integration**: All critical paths verified

### Quality Gates

- ✅ All parameter validation scenarios covered
- ✅ All error response types tested
- ✅ All service integration patterns verified
- ✅ Response format consistency validated
- ✅ No production data dependencies
