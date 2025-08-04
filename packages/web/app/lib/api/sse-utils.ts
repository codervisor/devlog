/**
 * SSE Utilities (Legacy - now using server-realtime.ts)
 */

import { serverRealtimeService } from './server-realtime';

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

// Re-export active connections for backward compatibility
export { activeConnections } from './server-realtime';

// Function to broadcast updates to all connected clients
export function broadcastUpdate(type: string, data: any) {
  // Use the new server realtime service
  serverRealtimeService.broadcast(type, data).catch((error) => {
    console.error('Error broadcasting update:', error);
  });
}
