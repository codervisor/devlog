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
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.add(handler);
    }
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
    console.log(`[DevlogEventEmitter] Emitting ${event.type} to ${handlers?.size || 0} handlers`);
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

  /**
   * Get instance identifier for debugging
   */
  getInstanceId(): string {
    return `DevlogEventEmitter@${this.constructor.name}_${Date.now()}`;
  }
}

/**
 * Singleton pattern for global event emitter
 * Ensures single instance across all imports in the application
 */
let globalDevlogEvents: DevlogEventEmitter | null = null;

/**
 * Get the singleton instance of DevlogEventEmitter
 * This ensures all parts of the application use the same event emitter instance
 */
export function getDevlogEvents(): DevlogEventEmitter {
  if (!globalDevlogEvents) {
    globalDevlogEvents = new DevlogEventEmitter();
    console.log('[DevlogEvents] Created singleton instance');
  }
  return globalDevlogEvents;
}

/**
 * Global event emitter instance
 * @deprecated Use getDevlogEvents() function instead to ensure singleton behavior
 */
export const devlogEvents = getDevlogEvents();
