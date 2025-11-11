/**
 * Server-side realtime broadcasting service
 */

import Pusher from 'pusher';
import { RealtimeConfig, RealtimeEventType } from '../realtime/types';

// Keep track of active SSE connections
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
  private activeProvider: 'sse' | 'pusher' = 'sse';

  private constructor() {
    this.initializePusher();
    this.selectActiveProvider();
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
      console.log('[Server Realtime] Pusher not configured');
      this.usePusher = false;
    }
  }

  /**
   * Selects the active provider based on deployment environment
   */
  private selectActiveProvider(): void {
    // Check for explicit provider override
    const forceProvider = process.env.NEXT_PUBLIC_REALTIME_PROVIDER;
    if (forceProvider === 'sse' || forceProvider === 'pusher') {
      if (forceProvider === 'pusher' && this.usePusher) {
        this.activeProvider = 'pusher';
      } else {
        this.activeProvider = 'sse';
      }
      console.log(`[Server Realtime] Using forced provider: ${this.activeProvider}`);
      return;
    }

    // Auto-detect based on deployment environment
    const isVercel = process.env.VERCEL === '1';
    const isNetlify = process.env.NETLIFY === 'true';
    const isServerless = isVercel || isNetlify;

    // Use Pusher for serverless deployments if configured, otherwise SSE
    if (isServerless && this.usePusher) {
      this.activeProvider = 'pusher';
      console.log('[Server Realtime] Detected serverless environment, using Pusher');
    } else {
      this.activeProvider = 'sse';
      console.log('[Server Realtime] Using SSE for traditional deployment');
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

    // Only broadcast via the active provider
    if (this.activeProvider === 'pusher' && this.usePusher && this.pusher) {
      try {
        await this.broadcastPusher(message);
        console.log(`[Server Realtime] Broadcast sent via Pusher: ${type}`);
      } catch (error) {
        console.error('[Server Realtime] Pusher broadcast failed, falling back to SSE:', error);
        this.broadcastSSE(message);
      }
    } else {
      this.broadcastSSE(message);
      console.log(`[Server Realtime] Broadcast sent via SSE: ${type}`);
    }
  }

  /**
   * Broadcast via Server-Sent Events
   */
  private broadcastSSE(message: BroadcastMessage): void {
    const sseMessage = JSON.stringify(message);

    console.log(
      `[Server Realtime] Broadcasting SSE: ${message.type} to ${activeConnections.size} connections`,
    );

    // Send to all active SSE connections
    for (const controller of activeConnections) {
      try {
        controller.enqueue(`data: ${sseMessage}\n\n`);
      } catch (error) {
        console.error(
          '[Server Realtime] Error sending SSE message, removing dead connection:',
          error,
        );
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
    return [this.activeProvider];
  }

  /**
   * Check if Pusher is enabled
   */
  isPusherEnabled(): boolean {
    return this.activeProvider === 'pusher' && this.usePusher;
  }

  /**
   * Get the active provider
   */
  getActiveProvider(): 'sse' | 'pusher' {
    return this.activeProvider;
  }

  /**
   * Get realtime configuration for client consumption
   */
  getRealtimeConfig(): RealtimeConfig {
    if (this.activeProvider === 'pusher') {
      return {
        provider: 'pusher',
        pusher: {
          appId: process.env.NEXT_PUBLIC_PUSHER_APP_ID,
          key: process.env.NEXT_PUBLIC_PUSHER_KEY,
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
          useTLS: process.env.PUSHER_USE_TLS !== 'false',
          channelName: this.channelName,
        },
      };
    }

    if (this.activeProvider === 'sse') {
      return {
        provider: 'sse',
        sse: {
          endpoint: '/api/events',
        },
      };
    }

    throw new Error('No active realtime provider configured');
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

// Function to broadcast updates to all connected clients
export function broadcastUpdate(type: string, data: any) {
  // Use the new server realtime service
  serverRealtimeService.broadcast(type, data).catch((error) => {
    console.error('Error broadcasting update:', error);
  });
}
