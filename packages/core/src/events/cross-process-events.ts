/**
 * Cross-process event system for devlog operations
 * Uses file-based event storage to bridge between processes
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { DevlogEvent, DevlogEventHandler } from './devlog-events.js';
import { getDevlogDirFromJsonConfig } from '../utils/storage.js';

export class CrossProcessEventSystem {
  private eventsDir: string;
  private eventIdCounter = 0;
  private pollInterval?: NodeJS.Timeout;
  private lastProcessedTime = 0;
  private handlers = new Map<string, Set<DevlogEventHandler>>();
  private initialized = false;

  constructor(private config: { directory?: string; global?: boolean } = {}) {
    const devlogDir = getDevlogDirFromJsonConfig({
      directory: config.directory || '.devlog',
      global: config.global !== undefined ? config.global : true,
      filePattern: '',
      minPadding: 3
    });
    this.eventsDir = path.join(devlogDir, 'events');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure events directory exists
    await fs.mkdir(this.eventsDir, { recursive: true });

    // Set last processed time to now to avoid processing old events
    this.lastProcessedTime = Date.now();

    // Start polling for events
    this.startPolling();
    this.initialized = true;

    console.error('Cross-process event system initialized');
  }

  async cleanup(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
    this.initialized = false;
  }

  /**
   * Subscribe to devlog events
   */
  on(eventType: string, handler: DevlogEventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  /**
   * Unsubscribe from devlog events
   */
  off(eventType: string, handler: DevlogEventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  /**
   * Emit an event to file system for cross-process communication
   */
  async emit(event: DevlogEvent): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const eventId = ++this.eventIdCounter;
      const timestamp = Date.now();
      const filename = `${timestamp}-${eventId}-${event.type}.json`;
      const filePath = path.join(this.eventsDir, filename);
      
      const eventData = {
        ...event,
        _metadata: {
          eventId,
          processId: process.pid,
          timestamp
        }
      };

      await fs.writeFile(filePath, JSON.stringify(eventData, null, 2));
      console.error(`Cross-process event written: ${filename}`);

      // Also emit locally for same-process handlers
      await this.processEvent(event);
    } catch (error) {
      console.error('Error writing cross-process event:', error);
    }
  }

  private startPolling(): void {
    // Poll every 500ms for new events
    this.pollInterval = setInterval(async () => {
      await this.pollForEvents();
    }, 500);
  }

  private async pollForEvents(): Promise<void> {
    try {
      const files = await fs.readdir(this.eventsDir);
      const eventFiles = files
        .filter(f => f.endsWith('.json'))
        .sort(); // Process in chronological order

      for (const file of eventFiles) {
        try {
          // Extract timestamp from filename
          const timestamp = parseInt(file.split('-')[0]);
          
          // Skip events that were created before our initialization or already processed
          if (timestamp <= this.lastProcessedTime) {
            continue;
          }

          const filePath = path.join(this.eventsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const eventData = JSON.parse(content);

          // Skip events from same process to avoid double processing
          if (eventData._metadata?.processId === process.pid) {
            continue;
          }

          // Process the event
          const event: DevlogEvent = {
            type: eventData.type,
            timestamp: eventData.timestamp,
            data: eventData.data
          };

          await this.processEvent(event);
          console.error(`Processed cross-process event: ${file}`);

          // Update last processed time
          this.lastProcessedTime = Math.max(this.lastProcessedTime, timestamp);

          // Clean up old event file
          await fs.unlink(filePath);
        } catch (error) {
          console.error(`Error processing event file ${file}:`, error);
        }
      }
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        console.error('Error polling for events:', error);
      }
    }
  }

  private async processEvent(event: DevlogEvent): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      await Promise.allSettled(
        Array.from(handlers).map(handler => {
          try {
            return Promise.resolve(handler(event));
          } catch (error) {
            console.error(`Error in cross-process event handler for ${event.type}:`, error);
            return Promise.resolve();
          }
        })
      );
    }
  }

  /**
   * Get count of handlers for debugging
   */
  getHandlerCount(eventType?: string): number {
    if (eventType) {
      return this.handlers.get(eventType)?.size || 0;
    }
    return Array.from(this.handlers.values()).reduce((sum, set) => sum + set.size, 0);
  }
}

// Global cross-process event system instance
export const crossProcessEvents = new CrossProcessEventSystem();
