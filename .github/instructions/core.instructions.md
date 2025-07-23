---
applyTo: 'packages/core/src/**/*.ts'
---

# Core Package Development Guidelines

## 🏗️ Architecture Requirements

### **⚠️ AUTOMATIC MIGRATION DETECTION**
**When editing these file patterns, ALWAYS check for cross-package impacts:**

#### **High-Impact Files (Require Migration Analysis)**
- `**/managers/**/*.ts` - Manager class changes affect MCP and Web packages
- `**/types/index.ts` - Type exports used across all packages
- `**/storage/index.ts` - Storage interfaces used by MCP and Web
- `**/events/**/*.ts` - Event definitions affect MCP and Web integration
- `**/services/**/*.ts` - Service classes used by MCP tools

#### **Automatic Migration Triggers**
🚨 **BEFORE making changes to:**
- **Manager classes** → Check MCP adapter, Web contexts, API routes
- **Storage interfaces** → Check MCP tools, Web API endpoints  
- **Type definitions** → Search for imports across all packages
- **Event interfaces** → Check MCP event handling, Web SSE
- **Service classes** → Check MCP tool integration, Web services

#### **Migration Detection Commands**
```bash
# Always run before modifying core architecture:
grep -r "YourClassName" packages/ --include="*.ts" --include="*.tsx"
grep -r "YourInterfaceName" packages/ --include="*.ts" --include="*.tsx"
```

### **Migration Impact Awareness**
⚠️ **When making core architecture changes:**
1. **Document breaking changes** clearly in devlog entries
2. **Identify affected packages** - MCP, Web, AI dependencies
3. **Provide migration guidance** for dependent packages
4. **Update cross-package examples** in instruction files
5. **Test integration points** after changes

### **Core-to-Package Impact Map:**
- **Manager class changes** → MCP adapter, Web contexts, API routes
- **Storage interface changes** → MCP tools, Web API endpoints
- **Type/Event changes** → All packages importing core types
- **Service class changes** → MCP integration, Web service layer

### Workspace Architecture Pattern
- **Use WorkspaceDevlogManager** for all new development (preferred)
- **DevlogManager is deprecated** - legacy support only
- **Workspace-aware patterns** support multi-workspace configurations
- **Single workspace context** per manager instance

### Manager Selection Guidelines
```typescript
// ✅ Preferred: Workspace-aware manager
import { WorkspaceDevlogManager } from '@devlog/core';

const manager = new WorkspaceDevlogManager({
  defaultWorkspaceId: 'primary',
  autoSwitchWorkspace: true
});

// ❌ Deprecated: Legacy manager (avoid in new code)
import { DevlogManager } from '@devlog/core';
```

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

## 📦 Import System Guidelines

### ESM Import Requirements
- **ALWAYS add .js extensions** for internal and external imports (including index.js)
- **Use relative imports** for intra-package references
- **Reserve @/ aliases** for cross-package imports only
- **Avoid self-referencing aliases** within the same package

### Correct Import Patterns
```typescript
// ✅ Internal package imports (same package)
import { DevlogManager } from './devlog-manager.js';
import { StorageProvider } from '../storage/index.js';
import type { DevlogEntry } from '../types/index.js';  // Explicit index.js for types too

// ✅ Cross-package imports
import { ChatParser } from '@devlog/ai';
import type { AIModel } from '@devlog/ai/models';

// ✅ External module imports
import { Database } from 'better-sqlite3';
import type { Request } from 'express';

// ❌ AVOID: Self-referencing aliases (ambiguous)
import { DevlogEntry } from '@/types'; // Which @? Root or package?

// ❌ AVOID: Missing .js extensions (breaks ESM)
import { StorageProvider } from '../storage';  // Missing index.js
import type { DevlogEvent } from './event';    // Missing .js
```

### TypeScript ESM Rules
- **Runtime imports**: Must include .js extensions for Node.js compatibility
- **Type-only imports**: Should also include .js/.js for consistency
- **Relative paths**: Provide explicit, unambiguous module resolution
- **Cross-package boundaries**: Use @devlog/* aliases for inter-package references

### Why These Rules Matter
- **Node.js ESM**: Requires explicit file extensions for module resolution
- **Build stability**: Relative imports don't break when files move within package
- **Clarity**: Explicit paths eliminate ambiguity about which module is imported
- **Tooling support**: Better IDE navigation and refactoring capabilities

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
