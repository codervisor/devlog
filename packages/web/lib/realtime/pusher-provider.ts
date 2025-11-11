/**
 * Pusher realtime provider implementation
 */

import Pusher from 'pusher-js';
import type { RealtimeProvider, RealtimeConnection, RealtimeMessage } from './types';

export class PusherProvider implements RealtimeProvider {
  private pusher: Pusher | null = null;
  private channel: any = null; // Pusher channel type
  private connectionState: RealtimeConnection = {
    connected: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
  };
  private listeners = new Map<string, (data: any) => void>();
  private connectionCallbacks = new Set<(connected: boolean) => void>();
  private config: {
    key: string;
    cluster: string;
    useTLS?: boolean;
    channelName?: string;
  };

  constructor(config: { key: string; cluster: string; useTLS?: boolean; channelName?: string }) {
    this.config = {
      useTLS: true,
      channelName: 'devlog-updates',
      ...config,
    };
  }

  async connect(): Promise<void> {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    try {
      this.pusher = new Pusher(this.config.key, {
        cluster: this.config.cluster,
        forceTLS: this.config.useTLS,
      });

      // Subscribe to the main channel
      this.channel = this.pusher.subscribe(this.config.channelName!);

      // Handle connection events
      this.pusher.connection.bind('connected', () => {
        console.log('[Pusher] Connected');
        this.connectionState.connected = true;
        this.connectionState.reconnectAttempts = 0;
        this.notifyConnectionChange(true);
      });

      this.pusher.connection.bind('disconnected', () => {
        console.log('[Pusher] Disconnected');
        this.connectionState.connected = false;
        this.notifyConnectionChange(false);
      });

      this.pusher.connection.bind('error', (error: any) => {
        console.error('[Pusher] Connection error:', error);
        this.connectionState.connected = false;
        this.connectionState.reconnectAttempts++;
        this.notifyConnectionChange(false);
      });

      // Bind existing listeners to the channel
      for (const [eventType, callback] of this.listeners.entries()) {
        this.bindChannelEvent(eventType, callback);
      }
    } catch (error) {
      console.error('[Pusher] Failed to connect:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.channel) {
      this.pusher?.unsubscribe(this.config.channelName!);
      this.channel = null;
    }

    if (this.pusher) {
      this.pusher.disconnect();
      this.pusher = null;
    }

    this.connectionState.connected = false;
    this.connectionState.reconnectAttempts = 0;
    this.notifyConnectionChange(false);
  }

  subscribe(eventType: string, callback: (data: any) => void): void {
    this.listeners.set(eventType, callback);

    // If we're already connected, bind the event immediately
    if (this.channel) {
      this.bindChannelEvent(eventType, callback);
    }
  }

  unsubscribe(eventType: string): void {
    this.listeners.delete(eventType);

    // Unbind from channel if connected
    if (this.channel) {
      this.channel.unbind(eventType);
    }
  }

  getConnectionState(): RealtimeConnection {
    return { ...this.connectionState };
  }

  onConnectionChange(callback: (connected: boolean) => void): void {
    this.connectionCallbacks.add(callback);
  }

  private bindChannelEvent(eventType: string, callback: (data: any) => void): void {
    if (!this.channel) return;

    this.channel.bind(eventType, (data: any) => {
      console.log(`[Pusher] Received event: ${eventType}`, data);

      // Wrap in our standard message format for consistency
      const message: RealtimeMessage = {
        type: eventType,
        data,
        timestamp: new Date().toISOString(),
      };

      callback(data);

      // Also dispatch as custom event for compatibility
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('realtime-message', {
            detail: message,
          }),
        );
      }
    });
  }

  private notifyConnectionChange(connected: boolean): void {
    for (const callback of this.connectionCallbacks) {
      try {
        callback(connected);
      } catch (error) {
        console.error('[Pusher] Error in connection callback:', error);
      }
    }
  }
}
