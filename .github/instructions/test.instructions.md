---
applyTo: '**/__tests__/*.test.ts'
---

# Test Implementation Guidelines

## 🧪 Testing Framework & Setup

### Primary Testing Stack
- **Framework**: Vitest (Node.js environment)
- **Mocking**: Vitest built-in mocking (`vi.fn()`, `vi.mock()`)
- **Assertions**: Vitest/Jest-style expectations
- **Timeout**: 30 seconds for integration tests
- **Coverage**: V8 provider with text, JSON, and HTML reports

### Test File Organization
- **Location**: `src/__tests__/*.test.ts` in each package
- **Naming**: `{feature-name}.test.ts` (kebab-case)
- **Structure**: One test file per main module/class

## 🏗️ Test Architecture Patterns

### Isolation & Cleanup
```typescript
// REQUIRED: Proper test isolation setup
let testDir: string;
let originalCwd: string;
let originalEnv: NodeJS.ProcessEnv;

beforeEach(async () => {
  // Store original state
  originalCwd = process.cwd();
  originalEnv = { ...process.env };
  
  // Create isolated test environment
  testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-'));
  process.chdir(testDir);
  
  // Configure test-specific environment
  process.env.DEVLOG_JSON_DIRECTORY = '.devlog-test';
  process.env.DEVLOG_JSON_GLOBAL = 'false';
});

afterEach(async () => {
  // Restore original state
  process.env = originalEnv;
  process.chdir(originalCwd);
  
  // Clean up test artifacts
  await fs.rm(testDir, { recursive: true, force: true });
});
```

### Test Environment Setup
- **ALWAYS create temporary directories** for file-based tests
- **ALWAYS restore original working directory** and environment
- **USE environment variables** instead of config files for testing
- **CREATE minimal package.json** to simulate project roots

## 📝 Test Writing Standards

### Test Structure
```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should describe expected behavior', async () => {
      // Arrange
      const input = createTestData();
      
      // Act
      const result = await component.method(input);
      
      // Assert
      expect(result).toBe(expectedValue);
    });
  });
});
```

### Required Test Categories
1. **Initialization**: Constructor, setup, configuration
2. **Core Functionality**: Main operations and workflows
3. **Edge Cases**: Error handling, boundary conditions
4. **Integration**: Cross-component interactions
5. **Cleanup**: Resource disposal, state restoration

### Naming Conventions
- **Test Files**: `feature-name.test.ts`
- **Test Suites**: Use exact class/module name
- **Test Cases**: Start with "should" + clear behavior description
- **Variables**: Descriptive names (`testEntry`, `mockConfig`, `expectedResult`)

## 🔧 Implementation Requirements

### File System Tests
- **Create unique temp directories** with timestamp/random suffix
- **Change working directory** to test environment
- **Mock file system operations** for unit tests
- **Test actual file operations** for integration tests
- **Verify file structure** and content in storage tests

### Database/Storage Tests
- **Isolate test data** using temporary directories
- **Test CRUD operations** comprehensively
- **Verify data integrity** and consistency
- **Test concurrent access** scenarios
- **Validate search and filtering** functionality

### Mocking Guidelines
```typescript
// External dependencies
global.fetch = vi.fn();

// Module mocking
vi.mock('external-library', () => ({
  default: vi.fn(),
  namedExport: vi.fn(),
}));

// Function mocking
const mockFunction = vi.fn().mockResolvedValue(expectedValue);
```

### Error Testing
- **Test error conditions** explicitly
- **Verify error messages** and types
- **Test recovery mechanisms**
- **Use `expect().rejects.toThrow()`** for async errors

## 📊 Test Coverage Standards

### Required Coverage Areas
- **Happy Path**: All main functionality
- **Error Handling**: All failure scenarios
- **Edge Cases**: Boundary conditions and limits
- **Integration Points**: Cross-component interactions
- **Configuration**: Various config scenarios

### Coverage Metrics
- **Statements**: Aim for 90%+ coverage
- **Branches**: Test all conditional paths
- **Functions**: Test all public methods
- **Lines**: Comprehensive line coverage

## 🔄 Integration Test Patterns

### MCP Server Tests
- **Test server initialization** and configuration
- **Verify transport layer** functionality
- **Test adapter operations** and responses
- **Validate workflow integration** end-to-end

### Storage Provider Tests
- **Test all storage implementations** (JSON, GitHub, etc.)
- **Verify data persistence** and retrieval
- **Test filtering and search** operations
- **Validate statistics** generation

### Manager Class Tests
- **Test full CRUD workflows**
- **Verify business logic** implementation
- **Test event handling** and notifications
- **Validate state management**

## ⚡ Performance Considerations

### Test Optimization
- **Use beforeEach/afterEach** for setup/cleanup
- **Avoid shared state** between tests
- **Mock external dependencies** to improve speed
- **Use `describe.concurrent`** for independent test suites

### Resource Management
- **Clean up temporary files** after each test
- **Dispose of resources** properly (databases, connections)
- **Avoid memory leaks** in long-running test suites
- **Use appropriate timeouts** for async operations

## 🚨 Critical Requirements

### MUST DO
- ✅ Create isolated test environments for each test
- ✅ Restore original state after tests complete
- ✅ Test both success and failure scenarios
- ✅ Use descriptive test names and clear assertions
- ✅ Mock external dependencies appropriately

### MUST NOT DO
- ❌ Share state between test cases
- ❌ Rely on external files or global state
- ❌ Skip cleanup in afterEach hooks
- ❌ Use hardcoded paths or fixed IDs
- ❌ Ignore async operation handling

## 🎯 Quality Checklist

Before submitting tests, ensure:
- [ ] All tests pass consistently
- [ ] No flaky or timing-dependent tests
- [ ] Proper error handling and edge cases covered
- [ ] Clear, descriptive test names
- [ ] Adequate coverage of public API
- [ ] No shared state or dependencies between tests
- [ ] Proper cleanup and resource disposal