/**
 * React hook for real-time agent events with hierarchy filtering
 *
 * Provides a simple interface for subscribing to agent events
 * with optional filtering by project, machine, or workspace.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface AgentEvent {
  id: string;
  timestamp: Date;
  eventType: string;
  agentId: string;
  agentVersion: string;
  sessionId: string;
  projectId: number;
  context: Record<string, unknown>;
  data: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  parentEventId?: string;
  relatedEventIds: string[];
  tags: string[];
  severity?: 'info' | 'warning' | 'error';
  session?: {
    workspace?: {
      machine?: any;
      project?: any;
    };
  };
}

export interface RealtimeEventsFilters {
  projectId?: number;
  machineId?: number;
  workspaceId?: number;
}

export interface UseRealtimeEventsOptions extends RealtimeEventsFilters {
  /**
   * Maximum number of events to keep in memory
   * @default 100
   */
  maxEvents?: number;

  /**
   * Whether to auto-connect on mount
   * @default true
   */
  autoConnect?: boolean;
}

/**
 * Hook for real-time agent events with hierarchy filtering
 *
 * @example
 * ```tsx
 * // Subscribe to all events for a project
 * const { events, isConnected } = useRealtimeEvents({ projectId: 1 });
 *
 * // Subscribe to events for a specific machine
 * const { events, isConnected } = useRealtimeEvents({
 *   projectId: 1,
 *   machineId: 5
 * });
 *
 * // Subscribe to events for a specific workspace
 * const { events, isConnected } = useRealtimeEvents({
 *   projectId: 1,
 *   workspaceId: 10
 * });
 * ```
 */
export function useRealtimeEvents(options: UseRealtimeEventsOptions = {}) {
  const { projectId, machineId, workspaceId, maxEvents = 100, autoConnect = true } = options;

  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Build query parameters
    const params = new URLSearchParams();
    if (projectId !== undefined) params.set('projectId', projectId.toString());
    if (machineId !== undefined) params.set('machineId', machineId.toString());
    if (workspaceId !== undefined) params.set('workspaceId', workspaceId.toString());

    // Create EventSource connection
    const url = `/api/events/stream?${params.toString()}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[useRealtimeEvents] Connected to event stream');
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
    };

    eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      console.log('[useRealtimeEvents] Connected:', data);
    });

    eventSource.addEventListener('events', (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'events' && Array.isArray(data.data)) {
          setEvents((prevEvents) => {
            // Add new events and keep only the most recent maxEvents
            const newEvents = [...data.data, ...prevEvents].slice(0, maxEvents);
            return newEvents;
          });
        }
      } catch (err) {
        console.error('[useRealtimeEvents] Error parsing event:', err);
      }
    });

    eventSource.onerror = (err) => {
      console.error('[useRealtimeEvents] EventSource error:', err);
      setIsConnected(false);

      // Attempt to reconnect with exponential backoff
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        console.log(`[useRealtimeEvents] Reconnecting in ${delay}ms...`);

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      } else {
        setError('Failed to connect to real-time events after multiple attempts');
        eventSource.close();
      }
    };
  }, [projectId, machineId, workspaceId, maxEvents]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    setIsConnected(false);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    /**
     * Array of agent events, most recent first
     */
    events,

    /**
     * Whether connected to the event stream
     */
    isConnected,

    /**
     * Error message if connection failed
     */
    error,

    /**
     * Manually connect to the event stream
     */
    connect,

    /**
     * Disconnect from the event stream
     */
    disconnect,

    /**
     * Clear all events from memory
     */
    clearEvents,
  };
}

/**
 * Hook for subscribing to specific event types
 *
 * @example
 * ```tsx
 * const { onEvent } = useAgentEventSubscription({ projectId: 1 });
 *
 * useEffect(() => {
 *   const unsubscribe = onEvent('file_write', (event) => {
 *     console.log('File written:', event.data);
 *   });
 *   return unsubscribe;
 * }, [onEvent]);
 * ```
 */
export function useAgentEventSubscription(filters: RealtimeEventsFilters = {}) {
  const { events } = useRealtimeEvents(filters);
  const callbacksRef = useRef<Map<string, Set<(event: AgentEvent) => void>>>(new Map());

  const onEvent = useCallback((eventType: string, callback: (event: AgentEvent) => void) => {
    if (!callbacksRef.current.has(eventType)) {
      callbacksRef.current.set(eventType, new Set());
    }
    callbacksRef.current.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = callbacksRef.current.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          callbacksRef.current.delete(eventType);
        }
      }
    };
  }, []);

  // Notify subscribers when new events arrive
  useEffect(() => {
    events.forEach((event) => {
      const callbacks = callbacksRef.current.get(event.eventType);
      if (callbacks) {
        callbacks.forEach((callback) => callback(event));
      }
    });
  }, [events]);

  return {
    onEvent,
    events,
  };
}
