# Library Organization

This directory contains utility functions and helpers organized into logical modules for better maintainability.

## Directory Structure

```
lib/
├── api/                    # API client utilities
│   ├── api-client.ts      # Main API client with error handling
│   ├── api-utils.ts       # API route utilities, response helpers
│   ├── note-api-client.ts # Note-specific API client
│   └── index.ts           # Re-exports for API utilities
├── devlog/                # Devlog-specific utilities
│   ├── devlog-options.ts  # Status, priority, type options
│   ├── devlog-ui-utils.tsx # UI helpers (colors, icons)
│   ├── note-utils.tsx     # Note category utilities
│   └── index.ts           # Re-exports for devlog utilities
├── routing/               # Next.js routing utilities
│   ├── route-params.ts    # Parameter parsing and validation
│   └── index.ts           # Re-exports for routing utilities
├── server/                # Server-side utilities
│   ├── sse-event-bridge.ts # SSE event handling
│   └── index.ts           # Re-exports for server utilities
├── utils/                 # General utilities
│   ├── time-utils.ts      # Date/time formatting
│   ├── utils.ts           # Tailwind CSS utilities (cn function)
│   └── index.ts           # Re-exports for general utilities
└── index.ts               # Main export file (re-exports all)
```

## Usage

### Option 1: Import from specific modules

```typescript
import { apiClient, ApiError } from '@/lib/api';
import { getStatusColor, getPriorityIcon } from '@/lib/devlog';
import { RouteParamParsers } from '@/lib/routing';
import { formatTimeAgo, cn } from '@/lib/utils';
```

### Option 2: Import from main index (recommended)

```typescript
import {
  apiClient,
  ApiError,
  getStatusColor,
  getPriorityIcon,
  RouteParamParsers,
  formatTimeAgo,
  cn,
} from '@/lib';
```

## Module Descriptions

### `api/` - API Client Utilities

- **api-client.ts**: Centralized API client with standardized error handling
- **api-utils.ts**: Next.js API route helpers, response formatters, parameter parsing
- **note-api-client.ts**: Specialized client for note operations

### `devlog/` - Devlog-Specific Utilities

- **devlog-options.ts**: Configuration for status, priority, and type options
- **devlog-ui-utils.tsx**: UI helpers for colors, icons, and visual elements
- **note-utils.tsx**: Note category configuration and utilities

### `routing/` - Next.js Routing Utilities

- **route-params.ts**: Type-safe parameter parsing for dynamic routes

### `server/` - Server-Side Utilities

- **sse-event-bridge.ts**: Server-Sent Events and real-time update handling

### `utils/` - General Utilities

- **time-utils.ts**: Date and time formatting utilities
- **utils.ts**: General utilities including Tailwind CSS class merging (`cn`)

## Benefits of This Organization

1. **Clear Separation of Concerns**: Each module has a specific purpose
2. **Easy to Navigate**: Related utilities are grouped together
3. **Flexible Imports**: Choose between specific modules or main index
4. **Scalable**: Easy to add new utilities to appropriate modules
5. **Maintainable**: Easier to locate and update specific functionality
