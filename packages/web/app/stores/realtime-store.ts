'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useDevlogStore } from './devlog-store';
import { useNotesStore } from './notes-store';

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
  handleMessage: (message: SSEMessage) => void;
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

        // Update devlog store connection status
        useDevlogStore.getState().setConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);
          console.log('SSE message:', message);

          // Handle the message internally
          get().handleMessage(message);

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

        // Update devlog store connection status
        useDevlogStore.getState().setConnected(false);

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

        // Update devlog store connection status
        useDevlogStore.getState().setConnected(false);
      }
    },

    subscribe: (messageType: string, callback: (data: any) => void) => {
      customListeners.set(messageType, callback);
    },

    unsubscribe: (messageType: string) => {
      customListeners.delete(messageType);
    },

    handleMessage: (message: SSEMessage) => {
      const { type, data } = message;

      // Route messages to appropriate stores
      switch (type) {
        case 'devlog_created':
          if (data) {
            useDevlogStore.getState().handleDevlogCreated(data);
          }
          break;

        case 'devlog_updated':
          if (data) {
            useDevlogStore.getState().handleDevlogUpdated(data);
          }
          break;

        case 'devlog_deleted':
          if (data) {
            useDevlogStore.getState().handleDevlogDeleted(data);
          }
          break;

        case 'note_created':
          if (data && data.devlogId) {
            useNotesStore.getState().handleNoteCreated(data.devlogId, data.note);
          }
          break;

        case 'note_updated':
          if (data && data.devlogId) {
            useNotesStore.getState().handleNoteUpdated(data.devlogId, data.note);
          }
          break;

        case 'note_deleted':
          if (data && data.devlogId && data.noteId) {
            useNotesStore.getState().handleNoteDeleted(data.devlogId, data.noteId);
          }
          break;

        default:
          console.log('Unhandled SSE message type:', type);
      }
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

// Hook to use SSE functionality (replaces useSse hook)
export const useRealtime = () => {
  const { connected, subscribe, unsubscribe } = useRealtimeStore();

  return {
    connected,
    subscribe,
    unsubscribe,
  };
};
