/**
 * Event system for devlog operations
 * Allows different parts of the application to react to devlog changes
 */
import { DevlogEvent, DevlogEventHandler } from '../types/index.js';

/**
 * Simple event emitter for devlog operations
 */
export class DevlogEventEmitter {
  private handlers = new Map<string, Set<DevlogEventHandler>>();

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
   * Emit a devlog event to all subscribers
   */
  async emit(event: DevlogEvent): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      // Execute all handlers in parallel
      await Promise.allSettled(
        Array.from(handlers).map((handler) => {
          try {
            return Promise.resolve(handler(event));
          } catch (error) {
            console.error(`Error in devlog event handler for ${event.type}:`, error);
            return Promise.resolve();
          }
        }),
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

  /**
   * Clear all handlers (useful for testing)
   */
  clear(): void {
    this.handlers.clear();
  }
}

// Global event emitter instance
export const devlogEvents = new DevlogEventEmitter();
