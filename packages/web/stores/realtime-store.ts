'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { realtimeService, type RealtimeConnection } from '@/lib/realtime';

interface RealtimeState {
  // Connection state
  connected: boolean;
  providerType: string | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;

  // Actions
  connect: () => void;
  disconnect: () => void;
  subscribe: (messageType: string, callback: (data: any) => void) => void;
  unsubscribe: (messageType: string) => void;
  getProviderType: () => string | null;
}

export const useRealtimeStore = create<RealtimeState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    connected: false,
    providerType: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,

    // Actions
    connect: async () => {
      // Only run on client side
      if (typeof window === 'undefined') {
        return;
      }

      try {
        await realtimeService.connect();
        
        // Update state based on realtime service
        const connectionState = realtimeService.getConnectionState();
        const providerType = realtimeService.getProviderType();
        
        set({
          connected: connectionState.connected,
          providerType,
          reconnectAttempts: connectionState.reconnectAttempts,
          maxReconnectAttempts: connectionState.maxReconnectAttempts,
        });

        // Listen for connection changes
        realtimeService.onConnectionChange((connected) => {
          const state = realtimeService.getConnectionState();
          set({
            connected,
            reconnectAttempts: state.reconnectAttempts,
          });
        });

        console.log(`[Realtime Store] Connected using ${providerType} provider`);
      } catch (error) {
        console.error('[Realtime Store] Failed to connect:', error);
        set({ connected: false });
      }
    },

    disconnect: async () => {
      try {
        await realtimeService.disconnect();
        set({
          connected: false,
          reconnectAttempts: 0,
        });
      } catch (error) {
        console.error('[Realtime Store] Failed to disconnect:', error);
      }
    },

    subscribe: (messageType: string, callback: (data: any) => void) => {
      realtimeService.subscribe(messageType, callback);
    },

    unsubscribe: (messageType: string) => {
      realtimeService.unsubscribe(messageType);
    },

    getProviderType: () => {
      return get().providerType;
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
