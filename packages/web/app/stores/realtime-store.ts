'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface SSEMessage {
  type: string;
  data?: any;
  timestamp: string;
}

interface RealtimeState {
  // Connection state
  connected: boolean;
  eventSource: EventSource | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;

  // Actions
  connect: () => void;
  disconnect: () => void;
  subscribe: (messageType: string, callback: (data: any) => void) => void;
  unsubscribe: (messageType: string) => void;
}

// Store for custom listeners (for components that need direct SSE access)
const customListeners = new Map<string, (data: any) => void>();

export const useRealtimeStore = create<RealtimeState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    connected: false,
    eventSource: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,

    // Actions
    connect: () => {
      // Only run on client side
      if (typeof window === 'undefined') {
        return;
      }

      const state = get();

      // Close existing connection if any
      if (state.eventSource) {
        state.eventSource.close();
      }

      const eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        console.log('SSE connected');
        set({
          connected: true,
          eventSource,
          reconnectAttempts: 0,
        });
      };

      eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);
          console.log('SSE message:', message);

          // Call custom listeners
          const listener = customListeners.get(message.type);
          if (listener && message.data) {
            listener(message.data);
          }

          // Also dispatch as custom event for components that prefer this approach
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('sse-message', {
                detail: message,
              }),
            );
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = () => {
        console.log('SSE error, attempting to reconnect...');
        const currentState = get();

        set({
          connected: false,
          reconnectAttempts: currentState.reconnectAttempts + 1,
        });

        // Attempt to reconnect if under limit
        if (currentState.reconnectAttempts < currentState.maxReconnectAttempts) {
          setTimeout(
            () => {
              if (get().eventSource?.readyState === EventSource.CLOSED) {
                get().connect();
              }
            },
            3000 * (currentState.reconnectAttempts + 1),
          ); // Exponential backoff
        }
      };

      set({ eventSource });
    },

    disconnect: () => {
      const state = get();
      if (state.eventSource) {
        state.eventSource.close();
        set({
          eventSource: null,
          connected: false,
          reconnectAttempts: 0,
        });
      }
    },

    subscribe: (messageType: string, callback: (data: any) => void) => {
      customListeners.set(messageType, callback);
    },

    unsubscribe: (messageType: string) => {
      customListeners.delete(messageType);
    },
  })),
);

// Auto-initialize connection when store is created (client-side only)
if (typeof window !== 'undefined') {
  // Connect when the store is first accessed
  setTimeout(() => {
    useRealtimeStore.getState().connect();
  }, 100);
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    useRealtimeStore.getState().disconnect();
  });
}
