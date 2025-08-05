---
applyTo: '**/*'
---

# Devlog Project Instructions

## Core Principles

**Occam's Razor**: Simple solutions are better than complex ones.

- **Quality over quantity**: Well-architected solutions over preserving legacy
- **One way to do it**: Clear recommendations eliminate decision paralysis  
- **Show, don't tell**: Examples over extensive documentation
- **TypeScript everywhere**: Type safety is non-negotiable

## Architecture Standards

### Service Pattern
```typescript
// ✅ Use Service classes (current architecture)
import { DevlogService, ProjectService } from '@codervisor/devlog-core';

// Singleton pattern with proper initialization
const projectService = ProjectService.getInstance();
await projectService.initialize();

const devlogService = DevlogService.getInstance(projectId);
await devlogService.ensureInitialized();

// ❌ Don't use deprecated manager classes
// import { WorkspaceDevlogManager } from '@codervisor/devlog-core'; // Not exported
```

### Dependency Injection
```typescript
// ✅ Constructor injection pattern
export class ServiceClass {
  constructor(
    private storage: IStorageProvider,
    private logger: ILogger = new ConsoleLogger()
  ) {}
  
  async initialize(): Promise<void> { /* setup */ }
  async dispose(): Promise<void> { /* cleanup */ }
}
```

### Event-Driven Communication
```typescript
// ✅ Use EventEmitter for internal communication
export interface DevlogEvents {
  'entry:created': { entry: DevlogEntry };
  'entry:updated': { entry: DevlogEntry };
}

// Emit events after successful operations
this.emit('entry:created', { entry });
```

## Import System

### ESM Requirements
```typescript
// ✅ Internal imports (same package) - ALWAYS add .js
import { DevlogManager } from './managers/devlog-manager.js';
import { StorageProvider } from '../storage/index.js';
import type { DevlogEntry } from '../types/index.js';

// ✅ Cross-package imports
import { DevlogService, ProjectService } from '@codervisor/devlog-core';
import { ChatParser } from '@codervisor/devlog-ai';

// ❌ Missing .js extensions (breaks ESM)
import { StorageProvider } from '../storage';

// ❌ Self-referencing aliases (ambiguous)  
import { DevlogEntry } from '@/types';
```

### Why .js Extensions Matter
- **Node.js ESM**: Requires explicit file extensions
- **Build stability**: Relative imports don't break when files move
- **Clarity**: Eliminates module resolution ambiguity

## TypeScript Standards

### Type Safety
```typescript
// ✅ Proper typing
interface DevlogEntry {
  id: number;
  title: string;
  status: 'new' | 'in-progress' | 'done';
}

// ✅ Generic constraints
interface Repository<T extends { id: number }> {
  save(item: T): Promise<T>;
  get(id: number): Promise<T | null>;
}

// ❌ No any types without justification
function process(data: any) { } // Don't do this
```

### Error Handling
```typescript
// ✅ Custom error classes
export class DevlogError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'DevlogError';
  }
}

// ✅ Result pattern for operations that can fail
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

async function saveEntry(entry: DevlogEntry): Promise<Result<DevlogEntry>> {
  try {
    const saved = await storage.save(entry);
    return { success: true, data: saved };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

## Testing Standards

### Test Structure
```typescript
// ✅ Test behavior, not implementation
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
  
  it('should create entry with valid data', async () => {
    const entry = { title: 'Test', type: 'feature' };
    const result = await manager.createEntry(entry);
    
    expect(result.success).toBe(true);
    expect(result.data.title).toBe('Test');
  });
  
  it('should handle storage errors gracefully', async () => {
    mockStorage.save.mockRejectedValue(new Error('Storage failed'));
    
    const result = await manager.createEntry({ title: 'Test' });
    
    expect(result.success).toBe(false);
    expect(result.error.message).toContain('Storage failed');
  });
});
```

### Testing Principles
- **Mock external dependencies** (database, file system, network)
- **Test both success and failure paths**
- **Keep tests isolated** (no shared state between tests)
- **Use descriptive test names** that explain expected behavior

## Web Development (Next.js)

### Component Patterns
```typescript
// ✅ Functional component with TypeScript
interface DevlogCardProps {
  devlog: DevlogEntry;
  onClick?: (devlog: DevlogEntry) => void;
  className?: string;
}

export function DevlogCard({ devlog, onClick, className }: DevlogCardProps) {
  return (
    <div 
      className={cn('rounded-lg border p-4', className)}
      onClick={() => onClick?.(devlog)}
    >
      <h3 className="text-lg font-semibold">{devlog.title}</h3>
      <StatusBadge status={devlog.status} />
    </div>
  );
}
```

### Next.js Import Rules
```typescript
// ✅ Next.js app directory (@ aliases work)
import { DevlogCard } from '@/components/devlog/devlog-card';
import { Button } from '@/components/ui/button';

// ✅ Relative imports for components
import { DevlogList } from './devlog-list';
import { StatusBadge } from '../ui/status-badge';

// ✅ Cross-package (no .js in Next.js)
import { DevlogManager } from '@codervisor/devlog-core';
```

### Server vs Client Components
```typescript
// ✅ Server Component (default) - for data fetching
async function DevlogList() {
  const devlogs = await api.getDevlogs();
  return <div>{devlogs.map(devlog => <DevlogCard key={devlog.id} devlog={devlog} />)}</div>;
}

// ✅ Client Component - for interactivity
'use client';
function InteractiveDevlogList() {
  const [selected, setSelected] = useState<DevlogEntry | null>(null);
  return <DevlogCard devlog={devlog} onClick={setSelected} />;
}
```

### Styling with Tailwind
```typescript
// ✅ Use utility classes
<button className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded">
  Click me
</button>

// ✅ Component variants with cn()
const buttonVariants = {
  variant: {
    default: "bg-primary text-primary-foreground",
    outline: "border border-input bg-background",
  },
  size: {
    default: "h-10 px-4 py-2",
    sm: "h-9 px-3",
  },
};

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
```

## File Organization

### Package Structure
```
packages/
├── core/src/
│   ├── index.ts              # Public API exports only
│   ├── managers/             # Main business logic
│   ├── services/             # Domain services  
│   ├── storage/              # Storage implementations
│   ├── types/                # Type definitions
│   └── utils/                # Pure utility functions
├── web/app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── {route}/page.tsx
└── web/components/
    ├── ui/                   # Reusable UI components
    └── features/             # Feature-specific components
```

### Export Patterns
```typescript
// ✅ src/index.ts - Public API only
export { DevlogService, ProjectService } from './services/index.js';
export type { DevlogEntry, DevlogConfig } from './types/index.js';

// ✅ Internal modules - relative imports
import { StorageProvider } from '../storage/base-storage.js';
```

## Development Workflow

### Build Dependencies
```bash
# Follow dependency chain
pnpm --filter @codervisor/devlog-core build
pnpm --filter @codervisor/devlog-mcp build  
pnpm --filter @codervisor/devlog-web build
```

### Development Environment
```bash
# Start containerized development
docker compose -f docker-compose.dev.yml up web-dev -d --wait

# Test build without breaking dev server
pnpm build
```

### Testing Workflow
```bash
# Run tests with proper isolation
pnpm test

# Test specific package
pnpm --filter @codervisor/devlog-core test
```

## Critical Rules

### MUST DO
- ✅ Add .js extensions to internal imports (ESM requirement)
- ✅ Use DevlogService and ProjectService for new features
- ✅ Implement initialize() and dispose() methods
- ✅ Handle all async operations with proper error handling
- ✅ Export types alongside implementations
- ✅ Test both success and failure paths

### MUST NOT DO  
- ❌ Use `any` type without explicit justification
- ❌ Use deprecated manager classes (not exported from core)
- ❌ Ignore error handling in async operations
- ❌ Create circular dependencies between modules
- ❌ Use self-referencing aliases within same package

## Decision Framework

### When Choosing Patterns
1. **Is there a recommended approach?** → Use it
2. **Does it follow TypeScript best practices?** → Required
3. **Is it the simplest solution that works?** → Occam's razor test
4. **Does it maintain type safety?** → Non-negotiable

### When in Doubt
- **Architecture questions**: Use DevlogService and ProjectService singleton patterns
- **Import questions**: Use relative paths with .js extensions
- **Testing questions**: Mock externals, test behavior
- **Styling questions**: Use Tailwind utilities with cn()

## Examples Repository

### Complete Service Implementation
```typescript
// packages/core/src/services/project-service.ts - Real working example
import { DataSource, Repository } from 'typeorm';
import type { ProjectMetadata } from '../types/project.js';
import { ProjectEntity } from '../entities/project.entity.js';
import { createDataSource } from '../utils/typeorm-config.js';

export class ProjectService {
  private static instance: ProjectService | null = null;
  private database: DataSource;
  private repository: Repository<ProjectEntity>;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.database = createDataSource({ entities: [ProjectEntity] });
    this.repository = this.database.getRepository(ProjectEntity);
  }

  static getInstance(): ProjectService {
    if (!ProjectService.instance) {
      ProjectService.instance = new ProjectService();
    }
    return ProjectService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise; // Return existing initialization promise
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    // Initialize the DataSource first
    if (!this.database.isInitialized) {
      await this.database.initialize();
    }

    // Create default project if it doesn't exist
    await this.createDefaultProject();
  }

  async list(): Promise<ProjectMetadata[]> {
    const entities = await this.repository.find({
      order: { lastAccessedAt: 'DESC' },
    });
    return entities.map((entity) => entity.toProjectMetadata());
  }

  async create(
    project: Omit<ProjectMetadata, 'id' | 'createdAt' | 'lastAccessedAt'>
  ): Promise<ProjectMetadata> {
    const entity = ProjectEntity.fromProjectData(project);
    const saved = await this.repository.save(entity);
    return saved.toProjectMetadata();
  }
}
```

---

**Remember**: Simple, focused solutions over complex, comprehensive ones. When in doubt, choose the clearer, more maintainable approach.
