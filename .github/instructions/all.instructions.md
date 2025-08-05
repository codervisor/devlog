---
applyTo: '**/*'
---

# Devlog Project - Comprehensive Patterns

## 🎯 When to Use This Guide

This guide provides detailed patterns and examples. Use it when you need:
- Specific implementation patterns
- Code examples and templates  
- Detailed architectural guidance
- Decision-making frameworks

For quick reference, see the global AI agent guidelines.

## AI Agent Task Workflow

### Before Starting Any Work
```
// 1. ALWAYS search for related devlogs first
mcp_devlog_find_related_devlogs({
  description: "brief description of planned work",
  keywords: ["relevant", "keywords"]
});

// 2. Check current project context
mcp_devlog_get_current_project();
```

### During Development Work
```
// Create devlog for substantial work (>30min)
mcp_devlog_create_devlog({
  title: "Clear, descriptive title",
  description: "Detailed description of the work",
  type: "feature", // or "bugfix", "refactor", "task"
  priority: "medium" // or "low", "high", "critical"
});

// Update progress at key points
mcp_devlog_add_devlog_note({
  id: 123, // devlog ID from creation
  note: "Completed milestone X, next working on Y",
  files: ["path/to/modified/files.ts"]
});

// Test UI changes for user-facing features
// Use Playwright MCP tools to verify critical workflows
// Navigate to localhost:3200 and test key user interactions
```

### When Work Is Complete
```
// Always complete with summary
mcp_devlog_complete_devlog({
  id: 123, // devlog ID
  summary: "What was accomplished, key learnings, any blockers resolved"
});
```

## Service Architecture

### Singleton Pattern
```typescript
// ✅ Current architecture - Use these services
import { DevlogService, ProjectService } from '@codervisor/devlog-core';

const projectService = ProjectService.getInstance();
await projectService.initialize();

const devlogService = DevlogService.getInstance(projectId);
await devlogService.ensureInitialized();
```

### Service Implementation Template
```typescript
export class ServiceClass {
  private static instance: ServiceClass | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(private storage: IStorageProvider) {}
  
  static getInstance(): ServiceClass {
    if (!ServiceClass.instance) {
      ServiceClass.instance = new ServiceClass();
    }
    return ServiceClass.instance;
  }

  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> { /* setup */ }
  async dispose(): Promise<void> { /* cleanup */ }
}
```

## Import System & TypeScript

### ESM Import Rules
```typescript
// ✅ Internal imports (same package) - ALWAYS add .js
import { DevlogManager } from './managers/devlog-manager.js';
import { StorageProvider } from '../storage/index.js';
import type { DevlogEntry } from '../types/index.js';

// ✅ Cross-package imports
import { DevlogService, ProjectService } from '@codervisor/devlog-core';
import { ChatParser } from '@codervisor/devlog-ai';
```

### Type Safety & Error Handling
```typescript
// ✅ Proper typing
interface DevlogEntry {
  id: number;
  title: string;
  status: 'new' | 'in-progress' | 'done';
}

// ✅ Result pattern for operations
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

// ✅ Custom error classes
export class DevlogError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'DevlogError';
  }
}
```

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

// ✅ Cross-package (no .js in Next.js)
import { DevlogManager } from '@codervisor/devlog-core';
```

## Testing Standards

### Test Structure
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

### UI Testing with Playwright
Use Playwright MCP tools to test user-facing features after implementation.

**When to UI Test:**
- After implementing new UI features or components
- When modifying existing user workflows
- For critical user interactions (create, edit, navigation)

**UI Testing Workflow:**
```typescript
// 1. Navigate to the development UI
mcp_playwright_browser_navigate({ url: "http://localhost:3200" });

// 2. Take accessibility snapshot (better than screenshot for actions)
mcp_playwright_browser_snapshot();

// 3. Interact with elements (click, type, etc.)
mcp_playwright_browser_click({
  element: "Create New Devlog button",
  ref: "button-create-devlog"
});

// 4. Verify results
mcp_playwright_browser_wait_for({ text: "Devlog created successfully" });

// 5. Document in devlog
mcp_devlog_add_devlog_note({
  id: 123,
  note: "UI tested: verified devlog creation workflow works correctly",
  category: "progress"
});
```

**Key Playwright Tools:**
- `browser_navigate`: Go to localhost:3200
- `browser_snapshot`: See current page state (use this for navigation)
- `browser_click`, `browser_type`: Interact with elements
- `browser_wait_for`: Wait for changes/text to appear
- `browser_take_screenshot`: Document UI state if needed

## File Organization & Development

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

### Development Workflow
```bash
# Follow dependency chain
pnpm --filter @codervisor/devlog-core build
pnpm --filter @codervisor/devlog-mcp build  
pnpm --filter @codervisor/devlog-web build

# Start containerized development
docker compose -f docker-compose.dev.yml up web-dev -d --wait

# Test build without breaking dev server
pnpm build 

# Run tests with proper isolation
pnpm test
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
