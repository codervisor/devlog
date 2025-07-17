---
applyTo: 'packages/core/src/**/*.ts'
---

# Core Package Development Guidelines

## 🏗️ Architecture Requirements

### Dependency Injection Pattern
- **Use constructor injection** for all external dependencies
- **Export interfaces** before implementations
- **Implement dispose() method** for resource cleanup
- **Support async initialization** with initialize() method

### Event-Driven Architecture
- **Use EventEmitter** for internal communication
- **Define event interfaces** in types/events.ts
- **Emit events** for state changes and important operations
- **Document event contracts** with clear payload types

### Error Handling Standards
- **Create custom error classes** for domain-specific errors
- **Use Result/Either patterns** for operations that can fail
- **Log errors with context** before throwing or returning
- **Provide meaningful error messages** for debugging

## 📁 File Organization Patterns

### Module Structure
```
src/
├── index.ts              # Public API exports only
├── {feature}-manager.ts  # Main manager classes
├── types/               
│   ├── index.ts         # Re-export all types
│   ├── {feature}.ts     # Feature-specific types
│   └── events.ts        # Event type definitions
├── services/
│   ├── {service}.ts     # Business logic services
│   └── index.ts         # Service exports
├── storage/
│   ├── {provider}.ts    # Storage implementations
│   └── base.ts          # Storage interface/base
└── utils/
    ├── {utility}.ts     # Pure utility functions
    └── index.ts         # Utility exports
```

### Export Patterns
- **Public API**: Only export from src/index.ts what external packages need
- **Internal APIs**: Use relative imports within the package
- **Type Exports**: Always export types alongside implementations
- **Barrel Exports**: Use index.ts files for clean import paths

## 🔧 Implementation Standards

### Class Design Patterns
```typescript
// Manager class template
export class DevlogManager implements IDevlogManager {
  private initialized = false;
  
  constructor(
    private storage: IStorageProvider,
    private config: DevlogConfig,
    private logger: ILogger = new ConsoleLogger()
  ) {}
  
  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.storage.initialize();
    this.initialized = true;
    this.emit('initialized');
  }
  
  async dispose(): Promise<void> {
    if (!this.initialized) return;
    await this.storage.dispose();
    this.initialized = false;
    this.emit('disposed');
  }
  
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new DevlogError('Manager not initialized. Call initialize() first.');
    }
  }
}
```

### Interface Definitions
- **Prefix interfaces** with 'I' (IStorageProvider, IDevlogManager)
- **Use generic types** where appropriate for reusability
- **Define method contracts** with clear parameter and return types
- **Include JSDoc comments** for public interface methods

### Type Safety Requirements
- **No `any` types** - use proper type definitions
- **Strict null checks** - handle undefined/null explicitly
- **Union types** for known value sets
- **Generic constraints** where type parameters need restrictions

## 📦 Storage Provider Patterns

### Implementation Requirements
```typescript
export abstract class BaseStorageProvider<TConfig = any> implements IStorageProvider {
  protected config: TConfig;
  protected initialized = false;
  
  constructor(config: TConfig) {
    this.config = this.normalizeConfig(config);
  }
  
  abstract initialize(): Promise<void>;
  abstract save(entry: DevlogEntry): Promise<DevlogEntry>;
  abstract get(id: number): Promise<DevlogEntry | null>;
  abstract list(filter?: ListFilter): Promise<ListResult<DevlogEntry>>;
  abstract search(query: string, filter?: SearchFilter): Promise<SearchResult<DevlogEntry>>;
  abstract delete(id: number): Promise<void>;
  abstract getStats(): Promise<DevlogStats>;
  abstract dispose(): Promise<void>;
  
  protected abstract normalizeConfig(config: TConfig): TConfig;
}
```

### Configuration Management
- **Validate configuration** in constructor
- **Provide sensible defaults** for optional settings
- **Support environment variable overrides**
- **Document configuration schema** with TypeScript types

## 🧪 Testing Requirements

### Test Structure
- **Create isolated test environments** for each test
- **Mock external dependencies** appropriately
- **Test both success and failure paths**
- **Use descriptive test names** that explain behavior

### Manager Testing Patterns
```typescript
describe('DevlogManager', () => {
  let manager: DevlogManager;
  let mockStorage: IStorageProvider;
  
  beforeEach(() => {
    mockStorage = createMockStorage();
    manager = new DevlogManager(mockStorage, testConfig);
  });
  
  afterEach(async () => {
    await manager.dispose();
  });
  
  it('should initialize storage on manager initialization', async () => {
    await manager.initialize();
    expect(mockStorage.initialize).toHaveBeenCalled();
  });
});
```

## 🔄 Event System Guidelines

### Event Definitions
```typescript
// types/events.ts
export interface DevlogEvents {
  'entry:created': { entry: DevlogEntry };
  'entry:updated': { entry: DevlogEntry; changes: Partial<DevlogEntry> };
  'entry:deleted': { id: number };
  'storage:error': { error: Error; operation: string };
}
```

### Event Emission
- **Emit events after successful operations**
- **Include relevant data** in event payload
- **Use consistent event naming** (resource:action pattern)
- **Document event timing** and guarantees

## 🚨 Critical Requirements

### MUST DO
- ✅ Implement initialize() and dispose() methods
- ✅ Handle async operations with proper error handling
- ✅ Export types alongside implementations
- ✅ Follow consistent naming conventions
- ✅ Include comprehensive JSDoc comments

### MUST NOT DO
- ❌ Use `any` type without explicit justification
- ❌ Perform side effects in constructors
- ❌ Ignore error handling in async operations
- ❌ Create circular dependencies between modules
- ❌ Export implementation details that should be private

## 🎯 Quality Standards

### Code Organization
- **Single Responsibility**: Each class/module has one clear purpose
- **Open/Closed**: Extensible without modification
- **Interface Segregation**: Focused, cohesive interfaces
- **Dependency Inversion**: Depend on abstractions, not concretions

### Performance Considerations
- **Lazy loading** for expensive operations
- **Connection pooling** for database/network resources
- **Caching strategies** for frequently accessed data
- **Resource cleanup** in dispose methods

### Documentation Standards
- **JSDoc comments** for all public APIs
- **Type documentation** for complex types
- **Example usage** in README files
- **Architecture decisions** in ADR format when significant
