# Workspace Management System

The workspace management system allows users to configure and switch between multiple devlog storage backends without losing access to existing data.

## Key Features

### 🔧 **Backend Infrastructure**
- **WorkspaceDevlogManager**: Workspace-aware devlog management with multi-storage support
- **Multiple Storage Providers**: JSON, GitHub Issues, PostgreSQL, MySQL, SQLite
- **Configuration Storage**: Workspace metadata stored in `~/.devlog/workspaces.json`
- **Fallback Support**: Graceful fallback to environment variables if no workspace config

### 🎨 **Frontend Interface**
- **Visual Workspace Management**: Full web UI for workspace CRUD operations
- **Storage Configuration Forms**: Type-specific configuration forms for each storage backend
- **Connection Health Monitoring**: Real-time connection status for each workspace
- **Workspace Switcher**: Quick switching between workspaces from navigation

### 🚀 **User Experience**
- **Seamless Switching**: Switch storage types without losing access to other workspaces
- **Visual Storage Indicators**: Clear icons and colors for different storage types
- **Concurrent Access**: Access devlogs from multiple workspaces simultaneously
- **Persistent Configuration**: Workspace settings preserved between sessions

## Architecture

### Configuration Structure
```json
{
  "defaultWorkspace": "my-dev-workspace",
  "workspaces": {
    "my-dev-workspace": {
      "workspace": {
        "id": "my-dev-workspace",
        "name": "Development Environment",
        "description": "Local JSON storage for development",
        "createdAt": "2025-07-22T10:00:00Z",
        "lastAccessedAt": "2025-07-22T11:00:00Z"
      },
      "storage": {
        "type": "json",
        "json": {
          "directory": ".devlog",
          "global": false
        }
      }
    },
    "github-testing": {
      "workspace": {
        "id": "github-testing", 
        "name": "GitHub Integration Testing",
        "description": "Testing GitHub Issues integration"
      },
      "storage": {
        "type": "github",
        "github": {
          "owner": "myorg",
          "repo": "my-project",
          "token": "ghp_..."
        }
      }
    }
  }
}
```

### API Endpoints

#### Workspace Management
- `GET /api/workspaces` - List all workspaces and current workspace
- `POST /api/workspaces` - Create new workspace
- `GET /api/workspaces/[id]` - Get workspace details and connection status
- `PUT /api/workspaces/[id]/switch` - Switch to workspace
- `DELETE /api/workspaces/[id]` - Delete workspace

#### Workspace-Scoped Operations
- `GET /api/workspaces/[id]/devlogs` - List devlogs from specific workspace

### Frontend Routes
- `/workspaces` - Workspace management page
- Navigation sidebar includes workspace switcher

## Usage Examples

### Creating a New Workspace
```typescript
// Via API
const workspace = {
  workspace: {
    id: 'production',
    name: 'Production Environment',
    description: 'PostgreSQL storage for production'
  },
  storage: {
    type: 'postgres',
    connectionString: 'postgresql://user:pass@host:5432/db'
  }
};

const response = await fetch('/api/workspaces', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(workspace)
});
```

### Switching Workspaces
```typescript
// Via API
await fetch('/api/workspaces/production/switch', { method: 'PUT' });

// Via WorkspaceDevlogManager
const manager = new WorkspaceDevlogManager();
await manager.switchToWorkspace('production');
```

### Accessing Cross-Workspace Data
```typescript
// Current workspace devlogs
const currentDevlogs = await manager.listDevlogs();

// Specific workspace devlogs
const prodDevlogs = await manager.listDevlogsFromWorkspace('production');
const devDevlogs = await manager.listDevlogsFromWorkspace('development');
```

## Configuration Migration

The system provides backward compatibility with existing `.env` configuration:

1. **New Users**: Workspaces are created automatically on first use
2. **Existing Users**: System falls back to `.env` configuration if no workspace config exists
3. **Migration Path**: Users can gradually migrate to workspace-based configuration

## Storage Type Support

### JSON Files (Local)
- **Use Case**: Development, local testing
- **Configuration**: Directory path, global vs project-local
- **Benefits**: Simple, no external dependencies

### GitHub Issues
- **Use Case**: Public projects, GitHub-centric workflows
- **Configuration**: Repository owner, repo name, access token
- **Benefits**: Public visibility, GitHub integration

### PostgreSQL
- **Use Case**: Production environments, team collaboration
- **Configuration**: Connection string
- **Benefits**: Scalable, ACID compliance, advanced querying

### MySQL
- **Use Case**: Existing MySQL infrastructure
- **Configuration**: Connection string
- **Benefits**: Wide compatibility, mature ecosystem

### SQLite
- **Use Case**: Single-user applications, embedded scenarios
- **Configuration**: Database file path
- **Benefits**: Zero configuration, serverless

## Security Considerations

- **Credential Storage**: Database credentials stored in local config file
- **Access Control**: Workspace access controlled by file system permissions
- **Token Management**: GitHub tokens stored securely in workspace config
- **Connection Validation**: Real-time connection health monitoring

## Future Enhancements

- **Workspace Sharing**: Export/import workspace configurations
- **Backup Strategies**: Automated backup across storage types
- **Sync Capabilities**: Synchronize devlogs between workspaces
- **Team Workspaces**: Shared workspace configurations for teams
- **Cloud Configuration**: Remote workspace configuration storage
