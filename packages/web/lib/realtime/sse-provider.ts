/**
 * Server-sent Events (SSE) realtime provider implementation
 */

import type { RealtimeProvider, RealtimeConnection, RealtimeMessage } from './types';

export class SSEProvider implements RealtimeProvider {
  private eventSource: EventSource | null = null;
  private connectionState: RealtimeConnection = {
    connected: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
  };
  private listeners = new Map<string, (data: any) => void>();
  private connectionCallbacks = new Set<(connected: boolean) => void>();
  private endpoint: string;
  private reconnectInterval: number;

  constructor(endpoint = '/api/events', reconnectInterval = 3000) {
    this.endpoint = endpoint;
    this.reconnectInterval = reconnectInterval;
  }

  async connect(): Promise<void> {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    // Close existing connection if any
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.eventSource = new EventSource(this.endpoint);

    this.eventSource.onopen = () => {
      console.log('[SSE] Connected');
      this.connectionState.connected = true;
      this.connectionState.reconnectAttempts = 0;
      this.notifyConnectionChange(true);
    };

    this.eventSource.onmessage = (event) => {
      try {
        const message: RealtimeMessage = JSON.parse(event.data);
        console.log('[SSE] Received message:', message);

        // Call registered listeners
        const listener = this.listeners.get(message.type);
        if (listener && message.data) {
          listener(message.data);
        }

        // Also dispatch as custom event for compatibility
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('realtime-message', {
              detail: message,
            }),
          );
        }
      } catch (error) {
        console.error('[SSE] Error parsing message:', error);
      }
    };

    this.eventSource.onerror = () => {
      console.log('[SSE] Connection error, attempting to reconnect...');
      this.connectionState.connected = false;
      this.connectionState.reconnectAttempts++;
      this.notifyConnectionChange(false);

      // Attempt to reconnect if under limit
      if (this.connectionState.reconnectAttempts < this.connectionState.maxReconnectAttempts) {
        setTimeout(() => {
          if (this.eventSource?.readyState === EventSource.CLOSED) {
            this.connect();
          }
        }, this.reconnectInterval * this.connectionState.reconnectAttempts); // Exponential backoff
      }
    };
  }

  async disconnect(): Promise<void> {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.connectionState.connected = false;
      this.connectionState.reconnectAttempts = 0;
      this.notifyConnectionChange(false);
    }
  }

  subscribe(channel: string, callback: (data: any) => void): void {
    this.listeners.set(channel, callback);
  }

  unsubscribe(channel: string): void {
    this.listeners.delete(channel);
  }

  getConnectionState(): RealtimeConnection {
    return { ...this.connectionState };
  }

  onConnectionChange(callback: (connected: boolean) => void): void {
    this.connectionCallbacks.add(callback);
  }

  private notifyConnectionChange(connected: boolean): void {
    for (const callback of this.connectionCallbacks) {
      try {
        callback(connected);
      } catch (error) {
        console.error('[SSE] Error in connection callback:', error);
      }
    }
  }
}
