/**
 * Bridge between devlog events and SSE broadcasts
 * This allows the web UI to receive realtime updates when devlogs are modified through any channel (MCP, API, etc.)
 */

import { devlogEvents, type DevlogEvent } from '@devlog/core';
import { broadcastUpdate } from './sse-manager';

class SSEEventBridge {
  private initialized = false;

  /**
   * Initialize the bridge to start listening to devlog events
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    // Listen to devlog events and broadcast them via SSE
    devlogEvents.on('created', this.handleDevlogCreated.bind(this));
    devlogEvents.on('updated', this.handleDevlogUpdated.bind(this));
    devlogEvents.on('deleted', this.handleDevlogDeleted.bind(this));
    devlogEvents.on('note-added', this.handleNoteAdded.bind(this));

    this.initialized = true;
    console.log('SSE Event Bridge initialized - devlog events will now trigger SSE updates');
  }

  private async handleDevlogCreated(event: DevlogEvent): Promise<void> {
    try {
      broadcastUpdate('devlog-created', event.data);
    } catch (error) {
      console.error('Error broadcasting devlog-created event:', error);
    }
  }

  private async handleDevlogUpdated(event: DevlogEvent): Promise<void> {
    try {
      broadcastUpdate('devlog-updated', event.data);
    } catch (error) {
      console.error('Error broadcasting devlog-updated event:', error);
    }
  }

  private async handleDevlogDeleted(event: DevlogEvent): Promise<void> {
    try {
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
  cleanup(): void {
    if (this.initialized) {
      devlogEvents.clear();
      this.initialized = false;
      console.log('SSE Event Bridge cleaned up');
    }
  }
}

// Global instance
export const sseEventBridge = new SSEEventBridge();
