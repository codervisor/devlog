/**
 * Bridge between devlog events and SSE broadcasts
 * This allows the web UI to receive realtime updates when devlogs are modified through any channel (MCP, API, etc.)
 */

// Keep track of active SSE connections
const activeConnections = new Set<ReadableStreamDefaultController>();

// Function to broadcast updates to all connected clients
export function broadcastUpdate(type: string, data: any) {
  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString(),
  });

  console.log(`Broadcasting SSE update: ${type} to ${activeConnections.size} connections`);

  // Send to all active connections
  for (const controller of activeConnections) {
    try {
      controller.enqueue(`data: ${message}\n\n`);
    } catch (error) {
      console.error('Error sending SSE message, removing dead connection:', error);
      // Remove dead connections
      activeConnections.delete(controller);
    }
  }
}

class SSEEventBridge {
  private initialized = false;

  /**
   * Initialize the bridge to start listening to devlog events
   */
  async initialize(): Promise<void> {}
}

// Global instance
export const sseEventBridge = new SSEEventBridge();

export { activeConnections };
