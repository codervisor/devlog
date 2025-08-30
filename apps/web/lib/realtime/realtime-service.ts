/**
 * Frontend realtime service that manages provider selection and operation
 */

import type { RealtimeConnection, RealtimeProvider } from './types';
import { SSEProvider } from './sse-provider';
import { PusherProvider } from './pusher-provider';
import { getRealtimeConfig, getRealtimeConfigSync } from './config';

export class RealtimeService {
  private static instance: RealtimeService | null = null;
  private provider: RealtimeProvider | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  /**
   * Initialize the realtime service with the appropriate provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const config = await getRealtimeConfig();

    // Log configuration for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Realtime] Configuration received from server:', config);
    }

    try {
      // Create the appropriate provider
      switch (config.provider) {
        case 'pusher':
          if (!config.pusher) {
            throw new Error('Pusher configuration missing');
          }
          if (!config.pusher.key || !config.pusher.cluster) {
            throw new Error('Pusher key or cluster not configured');
          }
          this.provider = new PusherProvider({
            key: config.pusher.key,
            cluster: config.pusher.cluster,
            useTLS: config.pusher.useTLS,
            channelName: 'devlog-updates',
          });
          break;

        case 'sse':
        default:
          this.provider = new SSEProvider(config.sse?.endpoint, config.sse?.reconnectInterval);
          break;
      }

      // Connect to the provider
      await this.provider.connect();
      this.initialized = true;

      console.log(`[Realtime] Initialized with ${config.provider} provider`);
    } catch (error) {
      console.error('[Realtime] Failed to initialize provider:', error);

      // Fallback to SSE if Pusher fails
      if (config.provider === 'pusher') {
        console.log('[Realtime] Falling back to SSE provider');
        this.provider = new SSEProvider();
        await this.provider.connect();
        this.initialized = true;
      } else {
        throw error;
      }
    }
  }

  /**
   * Connect to the realtime service (will initialize if needed)
   */
  async connect(): Promise<void> {
    if (!this.initialized) {
      await this.ensureInitialized();
    } else if (this.provider) {
      await this.provider.connect();
    }
  }

  /**
   * Disconnect from the realtime service
   */
  async disconnect(): Promise<void> {
    if (this.provider) {
      await this.provider.disconnect();
    }
  }

  /**
   * Subscribe to a specific event type
   */
  subscribe(eventType: string, callback: (data: any) => void): void {
    if (!this.provider) {
      console.warn('[Realtime] Cannot subscribe - provider not initialized');
      return;
    }
    this.provider.subscribe(eventType, callback);
  }

  /**
   * Unsubscribe from a specific event type
   */
  unsubscribe(eventType: string): void {
    if (!this.provider) {
      return;
    }
    this.provider.unsubscribe(eventType);
  }

  /**
   * Get the current connection state
   */
  getConnectionState(): RealtimeConnection {
    if (!this.provider) {
      return {
        connected: false,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
      };
    }
    return this.provider.getConnectionState();
  }

  /**
   * Register a callback for connection state changes
   */
  onConnectionChange(callback: (connected: boolean) => void): void {
    if (!this.provider) {
      console.warn('[Realtime] Cannot register connection callback - provider not initialized');
      return;
    }
    this.provider.onConnectionChange(callback);
  }

  /**
   * Get the current provider type
   */
  getProviderType(): string | null {
    const config = getRealtimeConfigSync();
    return config.provider;
  }

  /**
   * Check if the service is initialized and connected
   */
  isConnected(): boolean {
    return this.initialized && this.getConnectionState().connected;
  }

  /**
   * Dispose of the service and cleanup resources
   */
  async dispose(): Promise<void> {
    await this.disconnect();
    this.provider = null;
    this.initialized = false;
  }
}
