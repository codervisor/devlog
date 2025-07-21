/**
 * Bridge between devlog events and SSE broadcasts
 * This allows the web UI to receive realtime updates when devlogs are modified through any channel (MCP, API, etc.)
 */

import { broadcastUpdate } from './sse-manager';

// Types only - won't be bundled at runtime
import type { DevlogManager, DevlogEvent } from '@devlog/core';

class SSEEventBridge {
  private initialized = false;
  private devlogManager?: DevlogManager;

  /**
   * Initialize the bridge to start listening to devlog events
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('SSE Event Bridge already initialized');
      return;
    }

    try {
      // Dynamically import to avoid bundling TypeORM in client-side code
      const { DevlogManager, devlogEvents } = await import('@devlog/core');
      
      // Create and initialize DevlogManager for the web process
      this.devlogManager = new DevlogManager();
      await this.devlogManager.initialize();

      // Listen to local devlog events (which now include storage events via subscription)
      devlogEvents.on('created', this.handleDevlogCreated.bind(this));
      devlogEvents.on('updated', this.handleDevlogUpdated.bind(this));
      devlogEvents.on('deleted', this.handleDevlogDeleted.bind(this));
      devlogEvents.on('note-added', this.handleNoteAdded.bind(this));

      this.initialized = true;
      console.log('SSE Event Bridge initialized - devlog events will now trigger SSE updates');
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
        deletedAt: event.timestamp 
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

  /**
   * Cleanup method for graceful shutdown
   */
  async cleanup(): Promise<void> {
    if (this.initialized) {
      // Cleanup DevlogManager (which will unsubscribe from storage events)
      if (this.devlogManager) {
        await this.devlogManager.dispose();
        this.devlogManager = undefined;
      }
      
      this.initialized = false;
      console.log('SSE Event Bridge cleaned up');
    }
  }
}

// Global instance
export const sseEventBridge = new SSEEventBridge();
