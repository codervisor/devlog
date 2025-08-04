/**
 * SSE Utilities
 */

export class SSEEventType {
  static PROJECT_CREATED = 'project-created';
  static PROJECT_UPDATED = 'project-updated';
  static PROJECT_DELETED = 'project-deleted';
  static DEVLOG_CREATED = 'devlog-created';
  static DEVLOG_UPDATED = 'devlog-updated';
  static DEVLOG_DELETED = 'devlog-deleted';
  static DEVLOG_NOTE_CREATED = 'devlog-note-created';
  static DEVLOG_NOTE_UPDATED = 'devlog-note-updated';
  static DEVLOG_NOTE_DELETED = 'devlog-note-deleted';
}

// Keep track of active SSE connections
export const activeConnections = new Set<ReadableStreamDefaultController>();

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
