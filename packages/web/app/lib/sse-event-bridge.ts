/**
 * Bridge between devlog events and SSE broadcasts
 * This allows the web UI to receive realtime updates when devlogs are modified through any channel (MCP, API, etc.)
 */

import { crossProcessEvents, type DevlogEvent } from '@devlog/core';
import { broadcastUpdate } from './sse-manager';

class SSEEventBridge {
  private initialized = false;

  /**
   * Initialize the bridge to start listening to devlog events
   */
  initialize(): void {
    if (this.initialized) {
      console.log('SSE Event Bridge already initialized');
      return;
    }

    // Listen to cross-process devlog events and broadcast them via SSE
    crossProcessEvents.on('created', this.handleDevlogCreated.bind(this));
    crossProcessEvents.on('updated', this.handleDevlogUpdated.bind(this));
    crossProcessEvents.on('deleted', this.handleDevlogDeleted.bind(this));
    crossProcessEvents.on('note-added', this.handleNoteAdded.bind(this));

    this.initialized = true;
    console.log('SSE Event Bridge initialized - cross-process devlog events will now trigger SSE updates');
    console.log('Current cross-process event handlers:', crossProcessEvents.getHandlerCount());
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
  cleanup(): void {
    if (this.initialized) {
      crossProcessEvents.cleanup();
      this.initialized = false;
      console.log('SSE Event Bridge cleaned up');
    }
  }
}

// Global instance
export const sseEventBridge = new SSEEventBridge();
