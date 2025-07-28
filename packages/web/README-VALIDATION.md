# Web API Validation System

This document explains the multi-layer validation system implemented for the devlog web application.

## Overview

The validation system is designed with **two distinct layers**:

1. **Web Layer (API Routes)** - HTTP-specific validation in `app/schemas/`
2. **Core Layer (Business Logic)** - Domain validation in `packages/core/src/validation/`

## Architecture

```
HTTP Request
    ↓
┌─────────────────────────────────────┐
│ Web Layer (app/schemas/)            │
│ • Request format validation         │
│ • URL parameters & query strings    │
│ • JSON body structure              │
│ • HTTP-specific error responses     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Core Layer (core/validation/)       │
│ • Business rule validation          │
│ • Data integrity checks             │
│ • Domain-specific constraints       │
│ • Cross-entry point consistency     │
└─────────────────────────────────────┘
    ↓
Database/Service
```

## Web Layer Validation (`app/schemas/`)

### Structure

```
app/schemas/
├── index.ts          # Main exports and common schemas
├── project.ts        # Project-related validation schemas
├── devlog.ts         # Devlog entry validation schemas
└── validation.ts     # Reusable validation utilities
```

### Key Features

- **Type-safe HTTP validation** using Zod schemas
- **Automatic error responses** with proper HTTP status codes
- **URL parameter validation** with type transformation
- **Query parameter handling** for filtering and pagination
- **Centralized error handling** for consistent API responses

### Usage Example

```typescript
import { ApiValidator, CreateProjectBodySchema } from '@/schemas';

export async function POST(request: NextRequest) {
  // Validate request body
  const bodyValidation = await ApiValidator.validateJsonBody(request, CreateProjectBodySchema);
  if (!bodyValidation.success) {
    return bodyValidation.response; // Returns proper HTTP error
  }

  // bodyValidation.data is now type-safe
  const projectService = ProjectService.getInstance();
  const createdProject = await projectService.create(bodyValidation.data);
  
  return NextResponse.json(createdProject, { status: 201 });
}
```

## Core Layer Validation (`packages/core/src/validation/`)

### Purpose

- **Business rule enforcement** (e.g., unique project names)
- **Data integrity validation** (e.g., required fields, constraints)
- **Cross-platform consistency** (works with Web, CLI, MCP)
- **Domain-specific validation logic**

### Usage Example

```typescript
// In ProjectService
async create(projectData: unknown): Promise<ProjectMetadata> {
  // Validate input data
  const validation = ProjectValidator.validateCreateRequest(projectData);
  if (!validation.success) {
    throw new Error(`Invalid project data: ${validation.errors.join(', ')}`);
  }

  // Business rule validation
  const uniqueCheck = await ProjectValidator.validateUniqueProjectName(
    validation.data.name,
    undefined,
    this.checkNameExists.bind(this)
  );
  
  if (!uniqueCheck.success) {
    throw new Error(uniqueCheck.error!);
  }

  // Proceed with creation...
}
```

## Import Patterns

### ✅ Correct Patterns

```typescript
// Web layer - use @ alias, no .js extensions
import { ApiValidator, CreateProjectBodySchema } from '@/schemas';

// Core layer - use .js extensions for ESM compatibility
import { ProjectValidator } from '../validation/project-schemas.js';

// Cross-package - use package aliases
import { ProjectService } from '@codervisor/devlog-core';
```

### ❌ Avoid These Patterns

```typescript
// Don't use relative paths when @ alias is available
import { ApiValidator } from '../../schemas/validation.js';

// Don't omit .js in core package (ESM requirement)
import { ProjectValidator } from '../validation/project-schemas';
```

## Error Handling

### HTTP Errors (Web Layer)

The `ApiValidator.handleServiceError()` method automatically maps service errors to appropriate HTTP status codes:

- **400 Bad Request** - Validation errors, invalid data
- **404 Not Found** - Resource not found
- **409 Conflict** - Duplicate resources (e.g., name conflicts)
- **500 Internal Server Error** - Unexpected errors

### Service Errors (Core Layer)

Core services throw descriptive Error objects with messages that can be safely exposed to clients:

```typescript
throw new Error('Invalid project data: name is required');
throw new Error('Project with name "Example" already exists');
throw new Error('Project with ID "123" not found');
```

## Schema Examples

### Project Creation

```typescript
// Web schema (HTTP format validation)
export const CreateProjectBodySchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  repositoryUrl: z.string().optional(),
  settings: z.object({
    defaultPriority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    // ... other settings
  }).optional(),
});

// Core schema (business logic validation)  
export const CreateProjectRequestSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Project name can only contain letters, numbers, spaces, hyphens, and underscores'),
  // ... more restrictive business rules
}) satisfies z.ZodType<Omit<ProjectMetadata, 'id' | 'createdAt' | 'lastAccessedAt'>>;
```

## Benefits

1. **Type Safety** - Full TypeScript integration with runtime validation
2. **Separation of Concerns** - HTTP vs business logic validation
3. **Consistency** - Same validation logic across all entry points
4. **Developer Experience** - Clear error messages and IDE support
5. **Maintainability** - Centralized schemas and validation logic
6. **Extensibility** - Easy to add new validation rules and endpoints

## Testing

The validation system can be tested at both layers:

```typescript
// Test web layer
const result = await ApiValidator.validateJsonBody(mockRequest, CreateProjectBodySchema);
expect(result.success).toBe(true);

// Test core layer  
const validation = ProjectValidator.validateCreateRequest(mockData);
expect(validation.success).toBe(true);
```

This dual-layer approach ensures robust validation while maintaining clean separation between HTTP concerns and business logic.
