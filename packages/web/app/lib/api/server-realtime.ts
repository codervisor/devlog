/**
 * Server-side realtime broadcasting service
 */

import Pusher from 'pusher';
import { RealtimeEventType } from '../realtime/types';

// Keep track of active SSE connections (moved from sse-utils.ts)
export const activeConnections = new Set<ReadableStreamDefaultController>();

interface BroadcastMessage {
  type: string;
  data: any;
  timestamp?: string;
}

export class ServerRealtimeService {
  private static instance: ServerRealtimeService | null = null;
  private pusher: Pusher | null = null;
  private usePusher = false;
  private channelName = 'devlog-updates';

  private constructor() {
    this.initializePusher();
  }

  static getInstance(): ServerRealtimeService {
    if (!ServerRealtimeService.instance) {
      ServerRealtimeService.instance = new ServerRealtimeService();
    }
    return ServerRealtimeService.instance;
  }

  private initializePusher(): void {
    // Check if Pusher is configured
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (appId && key && secret && cluster) {
      try {
        this.pusher = new Pusher({
          appId,
          key,
          secret,
          cluster,
          useTLS: process.env.PUSHER_USE_TLS !== 'false',
        });
        this.usePusher = true;
        console.log('[Server Realtime] Pusher initialized for broadcasting');
      } catch (error) {
        console.error('[Server Realtime] Failed to initialize Pusher:', error);
        this.usePusher = false;
      }
    } else {
      console.log('[Server Realtime] Pusher not configured, using SSE only');
      this.usePusher = false;
    }
  }

  /**
   * Broadcast a message to all connected clients
   */
  async broadcast(type: string, data: any): Promise<void> {
    const message: BroadcastMessage = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    // Broadcast via SSE to active connections
    this.broadcastSSE(message);

    // Broadcast via Pusher if configured
    if (this.usePusher && this.pusher) {
      try {
        await this.broadcastPusher(message);
      } catch (error) {
        console.error('[Server Realtime] Pusher broadcast failed:', error);
      }
    }
  }

  /**
   * Broadcast via Server-Sent Events
   */
  private broadcastSSE(message: BroadcastMessage): void {
    const sseMessage = JSON.stringify(message);
    
    console.log(`[Server Realtime] Broadcasting SSE: ${message.type} to ${activeConnections.size} connections`);

    // Send to all active SSE connections
    for (const controller of activeConnections) {
      try {
        controller.enqueue(`data: ${sseMessage}\n\n`);
      } catch (error) {
        console.error('[Server Realtime] Error sending SSE message, removing dead connection:', error);
        // Remove dead connections
        activeConnections.delete(controller);
      }
    }
  }

  /**
   * Broadcast via Pusher
   */
  private async broadcastPusher(message: BroadcastMessage): Promise<void> {
    if (!this.pusher) return;

    try {
      await this.pusher.trigger(this.channelName, message.type, message.data);
      console.log(`[Server Realtime] Pusher broadcast sent: ${message.type}`);
    } catch (error) {
      console.error('[Server Realtime] Pusher broadcast error:', error);
      throw error;
    }
  }

  /**
   * Get the current broadcasting method(s)
   */
  getBroadcastMethods(): string[] {
    const methods: string[] = ['sse'];
    if (this.usePusher) {
      methods.push('pusher');
    }
    return methods;
  }

  /**
   * Check if Pusher is enabled
   */
  isPusherEnabled(): boolean {
    return this.usePusher;
  }

  /**
   * Get the number of active SSE connections
   */
  getSSEConnectionCount(): number {
    return activeConnections.size;
  }

  /**
   * Convenience methods for common events
   */
  async broadcastDevlogCreated(devlog: any): Promise<void> {
    await this.broadcast(RealtimeEventType.DEVLOG_CREATED, devlog);
  }

  async broadcastDevlogUpdated(devlog: any): Promise<void> {
    await this.broadcast(RealtimeEventType.DEVLOG_UPDATED, devlog);
  }

  async broadcastDevlogDeleted(devlogId: number): Promise<void> {
    await this.broadcast(RealtimeEventType.DEVLOG_DELETED, { id: devlogId });
  }

  async broadcastProjectCreated(project: any): Promise<void> {
    await this.broadcast(RealtimeEventType.PROJECT_CREATED, project);
  }

  async broadcastProjectUpdated(project: any): Promise<void> {
    await this.broadcast(RealtimeEventType.PROJECT_UPDATED, project);
  }

  async broadcastProjectDeleted(projectId: number): Promise<void> {
    await this.broadcast(RealtimeEventType.PROJECT_DELETED, { id: projectId });
  }
}

// Export singleton instance
export const serverRealtimeService = ServerRealtimeService.getInstance();
