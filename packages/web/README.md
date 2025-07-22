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

## Architecture

The web package consists of two main parts:

### Client (React App)

- Built with React 18 and TypeScript
- Styled with Tailwind CSS
- Bundled with Vite for fast development

### Server (Express API)

- RESTful API built with Express.js
- WebSocket support for real-time updates
- Integrates with `@devlog/core` for data management

## API Endpoints

- `GET /api/devlogs` - List all devlogs
- `POST /api/devlogs` - Create a new devlog
- `GET /api/devlogs/:id` - Get devlog by ID
- `PUT /api/devlogs/:id` - Update devlog
- `DELETE /api/devlogs/:id` - Delete devlog
- `GET /api/devlogs/stats/overview` - Get overview statistics
- `POST /api/devlogs/:id/notes` - Add note to devlog

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

## Environment Variables

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

## Development Guidelines

This package follows the project's dogfooding approach - use the devlog system to track development of the web interface
itself!
