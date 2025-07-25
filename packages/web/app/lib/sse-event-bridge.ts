/**
 * Bridge between devlog events and SSE broadcasts
 * This allows the web UI to receive realtime updates when devlogs are modified through any channel (MCP, API, etc.)
 */

import { broadcastUpdate } from './sse-manager';
import { getSharedWorkspaceManager } from './shared-workspace-manager';

// Types only - won't be bundled at runtime
import type { WorkspaceDevlogManager, DevlogEvent } from '@devlog/core';

class SSEEventBridge {
  private initialized = false;
  private workspaceManager?: WorkspaceDevlogManager;

  /**
   * Initialize the bridge to start listening to devlog events
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('SSE Event Bridge already initialized');
      return;
    }

    try {
      // Use the shared workspace manager instance
      this.workspaceManager = await getSharedWorkspaceManager();

      // Dynamically import to avoid bundling TypeORM in client-side code
      const { getDevlogEvents } = await import('@devlog/core');

      // Get the singleton devlogEvents instance to ensure we listen to the same instance
      // that WorkspaceDevlogManager emits to
      const devlogEvents = getDevlogEvents();

      // Listen to local devlog events (which now include storage events via subscription)
      devlogEvents.on('created', this.handleDevlogCreated.bind(this));
      devlogEvents.on('updated', this.handleDevlogUpdated.bind(this));
      devlogEvents.on('deleted', this.handleDevlogDeleted.bind(this));
      devlogEvents.on('note-added', this.handleNoteAdded.bind(this));
      devlogEvents.on('completed', this.handleDevlogCompleted.bind(this));
      devlogEvents.on('closed', this.handleDevlogClosed.bind(this));
      devlogEvents.on('archived', this.handleDevlogArchived.bind(this));
      devlogEvents.on('unarchived', this.handleDevlogUnarchived.bind(this));

      this.initialized = true;
      console.log('SSE Event Bridge initialized - devlog events will now trigger SSE updates');
      console.log('SSE Event Bridge - Handler counts:', {
        created: devlogEvents.getHandlerCount('created'),
        updated: devlogEvents.getHandlerCount('updated'),
        deleted: devlogEvents.getHandlerCount('deleted'),
        'note-added': devlogEvents.getHandlerCount('note-added'),
        completed: devlogEvents.getHandlerCount('completed'),
        closed: devlogEvents.getHandlerCount('closed'),
        archived: devlogEvents.getHandlerCount('archived'),
        unarchived: devlogEvents.getHandlerCount('unarchived'),
        total: devlogEvents.getHandlerCount(),
      });
    } catch (error) {
      console.error('Failed to initialize SSE Event Bridge:', error);
      throw error;
    }
  }

  private async handleDevlogCreated(event: DevlogEvent): Promise<void> {
    try {
      console.log('SSE Bridge: Broadcasting devlog-created event for ID:', event.data.id);
      broadcastUpdate('devlog-created', event.data);
    } catch (error) {
      console.error('Error broadcasting devlog-created event:', error);
    }
  }

  private async handleDevlogUpdated(event: DevlogEvent): Promise<void> {
    try {
      console.log('SSE Bridge: Broadcasting devlog-updated event for ID:', event.data.id);
      broadcastUpdate('devlog-updated', event.data);
    } catch (error) {
      console.error('Error broadcasting devlog-updated event:', error);
    }
  }

  private async handleDevlogDeleted(event: DevlogEvent): Promise<void> {
    try {
      console.log('SSE Bridge: Broadcasting devlog-deleted event for ID:', event.data.id);
      // For deletion, we broadcast the ID and basic info
      broadcastUpdate('devlog-deleted', {
        id: event.data.id,
        deletedAt: event.timestamp,
      });
    } catch (error) {
      console.error('Error broadcasting devlog-deleted event:', error);
    }
  }

  private async handleNoteAdded(event: DevlogEvent): Promise<void> {
    try {
      console.log('SSE Bridge: Broadcasting note-added event for devlog ID:', event.data.devlog.id);
      // For note addition, we broadcast the updated devlog
      // The client can choose to refresh the devlog or just show a notification
      broadcastUpdate('devlog-updated', event.data.devlog);
    } catch (error) {
      console.error('Error broadcasting note-added event:', error);
    }
  }

  private async handleDevlogCompleted(event: DevlogEvent): Promise<void> {
    try {
      console.log('SSE Bridge: Broadcasting devlog-completed event for ID:', event.data.id);
      broadcastUpdate('devlog-completed', event.data);
    } catch (error) {
      console.error('Error broadcasting devlog-completed event:', error);
    }
  }

  private async handleDevlogClosed(event: DevlogEvent): Promise<void> {
    try {
      console.log('SSE Bridge: Broadcasting devlog-closed event for ID:', event.data.id);
      broadcastUpdate('devlog-closed', event.data);
    } catch (error) {
      console.error('Error broadcasting devlog-closed event:', error);
    }
  }

  private async handleDevlogArchived(event: DevlogEvent): Promise<void> {
    try {
      console.log('SSE Bridge: Broadcasting devlog-archived event for ID:', event.data.id);
      broadcastUpdate('devlog-archived', event.data);
    } catch (error) {
      console.error('Error broadcasting devlog-archived event:', error);
    }
  }

  private async handleDevlogUnarchived(event: DevlogEvent): Promise<void> {
    try {
      console.log('SSE Bridge: Broadcasting devlog-unarchived event for ID:', event.data.id);
      broadcastUpdate('devlog-unarchived', event.data);
    } catch (error) {
      console.error('Error broadcasting devlog-unarchived event:', error);
    }
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async cleanup(): Promise<void> {
    if (this.initialized) {
      // Cleanup WorkspaceDevlogManager
      if (this.workspaceManager) {
        await this.workspaceManager.cleanup();
        this.workspaceManager = undefined;
      }

      this.initialized = false;
      console.log('SSE Event Bridge cleaned up');
    }
  }
}

// Global instance
export const sseEventBridge = new SSEEventBridge();
