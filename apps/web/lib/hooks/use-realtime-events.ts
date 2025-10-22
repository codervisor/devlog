/**
 * React hook for consuming real-time events via Server-Sent Events (SSE)
 * 
 * Provides automatic reconnection and event handling
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

export interface RealtimeEventData {
  [key: string]: any;
}

export interface UseRealtimeEventsOptions {
  /**
   * Callback fired when connected to the stream
   */
  onConnected?: () => void;

  /**
   * Callback fired when disconnected from the stream
   */
  onDisconnected?: () => void;

  /**
   * Callback fired when an error occurs
   */
  onError?: (error: Error) => void;

  /**
   * Whether to automatically reconnect on disconnect
   * @default true
   */
  autoReconnect?: boolean;

  /**
   * Reconnection delay in milliseconds
   * @default 3000
   */
  reconnectDelay?: number;

  /**
   * Maximum number of reconnection attempts
   * @default 10
   */
  maxReconnectAttempts?: number;
}

export interface RealtimeConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
  error: Error | null;
}

/**
 * Hook to consume real-time events from the SSE endpoint
 * 
 * @example
 * ```tsx
 * function DashboardStats() {
 *   const [stats, setStats] = useState(initialStats);
 *   const { status, subscribe } = useRealtimeEvents({
 *     onConnected: () => console.log('Connected!'),
 *   });
 * 
 *   useEffect(() => {
 *     const unsubscribe = subscribe('stats.updated', (data) => {
 *       setStats(data);
 *     });
 *     return unsubscribe;
 *   }, [subscribe]);
 * 
 *   return <div>Active Sessions: {stats.activeSessions}</div>;
 * }
 * ```
 */
export function useRealtimeEvents(options: UseRealtimeEventsOptions = {}) {
  const {
    onConnected,
    onDisconnected,
    onError,
    autoReconnect = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 10,
  } = options;

  const [status, setStatus] = useState<RealtimeConnectionStatus>({
    connected: false,
    reconnecting: false,
    reconnectAttempts: 0,
    error: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const listenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const eventSource = new EventSource('/api/events/stream');
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        console.log('[SSE] Connected:', data);
        
        setStatus({
          connected: true,
          reconnecting: false,
          reconnectAttempts: 0,
          error: null,
        });
        
        reconnectAttemptsRef.current = 0;
        onConnected?.();
      });

      eventSource.onerror = (error) => {
        console.error('[SSE] Error:', error);
        
        const errorObj = new Error('EventSource connection failed');
        setStatus((prev) => ({
          ...prev,
          connected: false,
          error: errorObj,
        }));
        
        onError?.(errorObj);
        
        // Attempt to reconnect if enabled
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          
          setStatus((prev) => ({
            ...prev,
            reconnecting: true,
            reconnectAttempts: reconnectAttemptsRef.current,
          }));

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`[SSE] Reconnecting... (attempt ${reconnectAttemptsRef.current})`);
            connect();
          }, reconnectDelay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error('[SSE] Max reconnection attempts reached');
          setStatus((prev) => ({
            ...prev,
            reconnecting: false,
          }));
        }
      };

      eventSource.onopen = () => {
        console.log('[SSE] Connection opened');
      };

      // Set up event listeners for all subscribed events
      for (const [eventType, callbacks] of listenersRef.current.entries()) {
        eventSource.addEventListener(eventType, (event) => {
          try {
            const data = JSON.parse(event.data);
            callbacks.forEach((callback) => callback(data));
          } catch (error) {
            console.error('[SSE] Error parsing event data:', error);
          }
        });
      }
    } catch (error) {
      console.error('[SSE] Error creating EventSource:', error);
      const errorObj = error instanceof Error ? error : new Error('Failed to create EventSource');
      setStatus({
        connected: false,
        reconnecting: false,
        reconnectAttempts: reconnectAttemptsRef.current,
        error: errorObj,
      });
      onError?.(errorObj);
    }
  }, [autoReconnect, maxReconnectAttempts, reconnectDelay, onConnected, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setStatus({
      connected: false,
      reconnecting: false,
      reconnectAttempts: 0,
      error: null,
    });

    onDisconnected?.();
  }, [onDisconnected]);

  const subscribe = useCallback((eventType: string, callback: (data: any) => void) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    
    listenersRef.current.get(eventType)!.add(callback);

    // If already connected, add the listener to the existing EventSource
    if (eventSourceRef.current && eventSourceRef.current.readyState === EventSource.OPEN) {
      eventSourceRef.current.addEventListener(eventType, (event) => {
        try {
          const data = JSON.parse(event.data);
          callback(data);
        } catch (error) {
          console.error('[SSE] Error parsing event data:', error);
        }
      });
    }

    // Return unsubscribe function
    return () => {
      const listeners = listenersRef.current.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          listenersRef.current.delete(eventType);
        }
      }
    };
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();

    // Disconnect on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    status,
    subscribe,
    disconnect,
    reconnect: connect,
  };
}
