# Realtime Updates System

This document describes the optimized realtime update system that supports both Server-Sent Events (SSE) and Pusher for different deployment environments.

## Overview

The realtime system automatically chooses the best transport method based on your deployment environment:

- **SSE (Server-Sent Events)**: Default for traditional deployments (Docker, self-hosted)
- **Pusher**: Automatically selected for serverless deployments (Vercel, Netlify) when configured

## Architecture

### Client-Side Components

- `RealtimeService`: Main service that manages provider selection and operation
- `SSEProvider`: Handles Server-Sent Events connections
- `PusherProvider`: Handles Pusher Channels connections
- `useRealtime()`: React hook for easy integration

### Server-Side Components

- `ServerRealtimeService`: Broadcasts messages to both SSE and Pusher
- Backward-compatible with existing `broadcastUpdate()` function

## Configuration

### Environment Variables

```bash
# Optional: Force a specific provider (auto-detected if not set)
NEXT_PUBLIC_REALTIME_PROVIDER="auto"  # "sse", "pusher", or "auto"

# SSE Configuration (used by default for non-serverless)
NEXT_PUBLIC_SSE_ENDPOINT="/api/events"
NEXT_PUBLIC_SSE_RECONNECT_INTERVAL="3000"

# Pusher Configuration (required for Pusher support)
PUSHER_APP_ID="your-app-id"
NEXT_PUBLIC_PUSHER_KEY="your-pusher-key"
PUSHER_SECRET="your-pusher-secret"
NEXT_PUBLIC_PUSHER_CLUSTER="us2"
PUSHER_USE_TLS="true"
```

### Auto-Detection Logic

1. Check `NEXT_PUBLIC_REALTIME_PROVIDER` for explicit preference
2. Detect if running on Vercel (`VERCEL=1`) or Netlify
3. Check if Pusher is properly configured
4. Use Pusher for serverless + configured, otherwise SSE

## Usage

### Basic React Hook

```typescript
import { useRealtime } from '@/hooks/use-realtime';

function MyComponent() {
  const { connected, providerType, subscribe } = useRealtime();

  useEffect(() => {
    const unsubscribe = subscribe('devlog-updated', (devlog) => {
      console.log('Devlog updated:', devlog);
    });

    return unsubscribe;
  }, [subscribe]);

  return (
    <div>
      Status: {connected ? 'Connected' : 'Disconnected'} 
      ({providerType})
    </div>
  );
}
```

### Event-Specific Hooks

```typescript
import { useDevlogEvents } from '@/hooks/use-realtime';

function DevlogList() {
  const { onDevlogCreated, onDevlogUpdated } = useDevlogEvents();

  useEffect(() => {
    const unsubscribeCreated = onDevlogCreated((devlog) => {
      // Handle new devlog
    });

    const unsubscribeUpdated = onDevlogUpdated((devlog) => {
      // Handle updated devlog
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
    };
  }, [onDevlogCreated, onDevlogUpdated]);
}
```

### Server-Side Broadcasting

```typescript
import { serverRealtimeService } from '@/lib/api/server-realtime';

// In your API route or server action
await serverRealtimeService.broadcastDevlogCreated(newDevlog);

// Or use the generic broadcast method
await serverRealtimeService.broadcast('custom-event', data);
```

### Status Components

```typescript
import { RealtimeStatus, RealtimeDebugInfo } from '@/components/realtime/realtime-status';

// Minimal status indicator
<RealtimeStatus />

// Detailed status (development only)
<RealtimeDebugInfo />
```

## Event Types

The system supports the following standard events:

- `project-created`
- `project-updated` 
- `project-deleted`
- `devlog-created`
- `devlog-updated`
- `devlog-deleted`
- `devlog-note-created`
- `devlog-note-updated`
- `devlog-note-deleted`

## Deployment Scenarios

### Traditional Docker Deployment

Uses SSE by default. No additional configuration needed.

```bash
# .env
# No realtime configuration needed - SSE works out of the box
```

### Vercel Deployment

1. Sign up for Pusher at https://pusher.com/channels
2. Create a new app and get your credentials
3. Add to Vercel environment variables:

```bash
PUSHER_APP_ID="123456"
NEXT_PUBLIC_PUSHER_KEY="abcdef123456"
PUSHER_SECRET="your-secret-key"
NEXT_PUBLIC_PUSHER_CLUSTER="us2"
```

The system will automatically detect Vercel and use Pusher.

### Local Development

SSE is used by default. To test Pusher locally:

```bash
# .env.local
NEXT_PUBLIC_REALTIME_PROVIDER="pusher"
PUSHER_APP_ID="123456"
NEXT_PUBLIC_PUSHER_KEY="abcdef123456"
PUSHER_SECRET="your-secret-key"
NEXT_PUBLIC_PUSHER_CLUSTER="us2"
```

## Migration from Previous System

The new system is backward compatible. Existing code using `useRealtimeStore` will continue to work without changes.

### Old API (still supported)
```typescript
const { connected, subscribe } = useRealtimeStore();
```

### New API (recommended)
```typescript
const { connected, subscribe } = useRealtime();
```

## Troubleshooting

### Debug Information

Enable debug mode in development:

```typescript
import { logRealtimeConfig } from '@/lib/realtime';

// Log current configuration
logRealtimeConfig();
```

### Common Issues

1. **Pusher not connecting**: Check that all environment variables are set correctly
2. **SSE disconnecting**: Verify your deployment supports long-running connections
3. **No events received**: Ensure server-side code is using `serverRealtimeService.broadcast()`

### Testing

You can test the system by checking the browser console and network tab:

- SSE: Look for `/api/events` connection in Network tab
- Pusher: Look for WebSocket connections to `ws-*.pusherapp.com`

## Performance Considerations

- **SSE**: Lower latency, uses one HTTP connection per client
- **Pusher**: Higher latency but better for serverless, uses WebSockets
- Both providers include automatic reconnection logic
- Connection state is managed automatically

## Security

- Pusher keys marked as `NEXT_PUBLIC_*` are safe for client-side use
- `PUSHER_SECRET` must be kept server-side only
- SSE endpoints should validate client permissions as needed
