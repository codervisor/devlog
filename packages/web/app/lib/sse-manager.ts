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

// Export the active connections for internal use
export { activeConnections };
