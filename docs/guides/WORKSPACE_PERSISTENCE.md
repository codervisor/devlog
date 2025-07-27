# Workspace Persistence Implementation

## Overview

This implementation solves the workspace metadata persistence challenge for both local development and cloud deployments like Vercel. The solution provides automatic detection between file-based and database-backed storage depending on the deployment environment.

## Architecture

### Components

1. **AutoWorkspaceManager** - Smart auto-selecting workspace manager
2. **DatabaseWorkspaceManager** - Database-backed storage for cloud deployments  
3. **FileWorkspaceManager** - File-based storage for local development
4. **WorkspaceEntity** - TypeORM entity for database persistence

### Auto-Detection Logic

The `AutoWorkspaceManager` automatically chooses the appropriate storage backend:

**Database Storage (PostgreSQL/MySQL/SQLite):**
- When `POSTGRES_URL` or `MYSQL_URL` environment variables are present
- When running on Vercel (`VERCEL` environment variable exists)
- In production environments with database configuration

**File Storage:**
- Local development environments
- When no database URLs are configured
- Fallback option for maximum compatibility

## Implementation Details

### Database Schema

The `WorkspaceEntity` stores workspace metadata in a `devlog_workspaces` table:

```sql
CREATE TABLE devlog_workspaces (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  description VARCHAR,
  settings JSONB,
  storage JSONB NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  lastAccessedAt TIMESTAMP NOT NULL
);
```

### File-Based Storage

Workspaces are stored in `~/.devlog/workspaces.json`:

```json
{
  "defaultWorkspace": "default",
  "workspaces": {
    "default": {
      "workspace": {
        "id": "default",
        "name": "Default Workspace",
        "createdAt": "2025-07-22T02:59:55.826Z",
        "lastAccessedAt": "2025-07-22T06:33:16.193Z"
      },
      "storage": {
        "type": "json",
        "json": { "directory": ".devlog", "global": false }
      }
    }
  }
}
```

## Usage

### Web API Integration

All workspace API routes have been updated to use the new persistence system:

```typescript
import { getWorkspaceManager, getStorageInfo } from '../../../lib/workspace-manager';

// The manager automatically selects appropriate storage
const manager = await getWorkspaceManager();
const workspaces = await manager.listWorkspaces();
const storageInfo = await getStorageInfo(); // For debugging
```

### Direct Usage

```typescript
import { AutoWorkspaceManager } from '@codervisor/devlog-core';

// Auto-detect storage type
const manager = new AutoWorkspaceManager({ storageType: 'auto' });
await manager.initialize();

// Force specific storage type
const fileManager = new AutoWorkspaceManager({ storageType: 'file' });
const dbManager = new AutoWorkspaceManager({ storageType: 'database' });
```

## Environment Configuration

### Local Development

```bash
# Uses file-based storage by default
# Workspaces stored in ~/.devlog/workspaces.json
```

### Cloud Deployment (Vercel)

```bash
# Set up PostgreSQL database
POSTGRES_URL="postgresql://user:pass@host:5432/database"

# System automatically detects and uses database storage
```

### Manual Override

```bash
# Force file storage even with database URL
DEVLOG_WORKSPACE_STORAGE="file"

# Force database storage
DEVLOG_WORKSPACE_STORAGE="database"
```

## Benefits

1. **Production Ready**: Database persistence survives server restarts
2. **Multi-Instance Safe**: Works across multiple serverless instances
3. **Development Friendly**: Local file storage for easy debugging
4. **Zero Configuration**: Automatic detection requires no setup
5. **Backward Compatible**: Existing file-based workspaces continue working

## Deployment Scenarios

### Vercel Deployment

```bash
# Set environment variables in Vercel dashboard
POSTGRES_URL="postgresql://..."

# System automatically:
# 1. Detects Vercel environment
# 2. Uses PostgreSQL for workspace metadata
# 3. Creates default workspace if none exist
```

### Local Development

```bash
# No configuration needed
# System automatically:
# 1. Uses ~/.devlog/workspaces.json
# 2. Creates default workspace
# 3. Maintains backward compatibility
```

### Docker/Kubernetes

```bash
# Set database URL in container environment
POSTGRES_URL="postgresql://..."

# System handles the rest automatically
```

## Migration Path

Existing installations automatically benefit from this implementation:

1. **Local Development**: Continues using file-based storage
2. **Cloud Migration**: Set `POSTGRES_URL` and redeploy - automatic migration
3. **Hybrid Setup**: Different environments can use different storage types

## API Changes

### Enhanced Responses

Workspace API responses now include storage information:

```json
{
  "workspaces": [...],
  "currentWorkspace": {...},
  "storageInfo": {
    "type": "file|database", 
    "manager": "FileWorkspaceManager|DatabaseWorkspaceManager"
  }
}
```

### Backward Compatibility

All existing API endpoints maintain the same interface while gaining persistence benefits.

## Testing

The implementation has been tested with:

1. ✅ Local file-based workspace operations
2. ✅ Auto-detection logic for different environments  
3. ✅ Web API integration with enhanced manager
4. ✅ Build success across all packages
5. ✅ Production deployment scenarios

## Monitoring

Use the `storageInfo` field in API responses to monitor which storage backend is active in each environment.
