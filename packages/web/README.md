# @devlog/web

Web interface for devlog management - A modern dashboard for tracking development progress.

## Features

- 📊 **Dashboard** - Overview of development progress with statistics
- 📝 **Devlog Management** - Create, edit, and delete development logs
- 🔄 **Real-time Updates** - Server-Sent Events (SSE) connection for live updates
- 🎨 **Modern UI** - Built with React and Tailwind CSS
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Getting Started

### Development

```bash
# Install dependencies
pnpm install

# Start development server (both client and server)
pnpm dev

### Production

```bash
# Build the application
pnpm build

# Start the production server
pnpm start
```

## API Endpoints

### Workspace Management
- `GET /api/workspaces` - List all workspaces
- `GET /api/workspaces/:id` - Get workspace details
- `PUT /api/workspaces/:id` - Update workspace configuration
- `POST /api/workspaces/:id/switch` - Switch to workspace

### Devlog Management (Workspace-Scoped)
- `GET /api/workspaces/:id/devlogs` - List devlogs in workspace
- `POST /api/workspaces/:id/devlogs` - Create devlog in workspace
- `GET /api/workspaces/:id/devlogs/:devlogId` - Get devlog by ID from workspace
- `PUT /api/workspaces/:id/devlogs/:devlogId` - Update devlog in workspace
- `DELETE /api/workspaces/:id/devlogs/:devlogId` - Delete devlog from workspace

### Statistics (Workspace-Scoped)
- `GET /api/workspaces/:id/devlogs/stats/overview` - Get overview statistics for workspace
- `GET /api/workspaces/:id/devlogs/stats/timeseries` - Get time series data for workspace

### Batch Operations (Workspace-Scoped)
- `POST /api/workspaces/:id/devlogs/batch/update` - Batch update devlogs in workspace
- `POST /api/workspaces/:id/devlogs/batch/delete` - Batch delete devlogs in workspace
- `POST /api/workspaces/:id/devlogs/batch/note` - Batch add notes to devlogs in workspace

## Server-Sent Events (SSE)

Real-time updates are implemented using Server-Sent Events instead of WebSockets for better compatibility with Next.js App Router.

### Events

- `connected` - Client successfully connected to SSE stream
- `devlog-created` - New devlog entry was created
- `devlog-updated` - Existing devlog entry was updated  
- `devlog-deleted` - Devlog entry was deleted

### Usage

```typescript
import { useServerSentEvents } from '@/hooks/useServerSentEvents';

function MyComponent() {
  const { connected, subscribe } = useServerSentEvents();
  
  useEffect(() => {
    subscribe('devlog-updated', (devlog) => {
      console.log('Devlog updated:', devlog);
    });
  }, [subscribe]);
  
  return <div>Connected: {connected}</div>;
}
```

## Development Guidelines

This package follows the project's dogfooding approach - use the devlog system to track development of the web interface
itself!
