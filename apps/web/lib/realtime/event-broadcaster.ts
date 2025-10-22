/**
 * Event Broadcaster
 * 
 * Simple in-memory event emitter for real-time updates via Server-Sent Events.
 * In production, this should use Redis pub/sub or similar for multi-instance support.
 */

export class EventBroadcaster {
  private static instance: EventBroadcaster;
  private clients: Set<ReadableStreamDefaultController> = new Set();

  private constructor() {}

  static getInstance(): EventBroadcaster {
    if (!EventBroadcaster.instance) {
      EventBroadcaster.instance = new EventBroadcaster();
    }
    return EventBroadcaster.instance;
  }

  addClient(controller: ReadableStreamDefaultController) {
    this.clients.add(controller);
  }

  removeClient(controller: ReadableStreamDefaultController) {
    this.clients.delete(controller);
  }

  broadcast(event: string, data: any) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(message);

    // Send to all connected clients
    for (const controller of this.clients) {
      try {
        controller.enqueue(encoded);
      } catch (error) {
        console.error('Error sending to client:', error);
        this.clients.delete(controller);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

/**
 * Helper function to broadcast events from other parts of the application
 * 
 * Usage example:
 * ```typescript
 * import { broadcastEvent } from '@/lib/realtime/event-broadcaster';
 * 
 * // When a new session is created
 * broadcastEvent('session.created', { sessionId: '123', agentId: 'copilot' });
 * 
 * // When session completes
 * broadcastEvent('session.completed', { sessionId: '123', outcome: 'success' });
 * 
 * // When new event is logged
 * broadcastEvent('event.created', { sessionId: '123', type: 'file_write' });
 * ```
 */
export function broadcastEvent(event: string, data: any) {
  const broadcaster = EventBroadcaster.getInstance();
  broadcaster.broadcast(event, data);
}
