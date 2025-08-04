/**
 * SSE Response Wrapper Utilities
 *
 * Simple wrappers for API responses that automatically trigger SSE broadcasts.
 * These can be easily integrated into existing API routes without major refactoring.
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
