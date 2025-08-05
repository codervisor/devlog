/**
 * React hook for realtime updates
 */

'use client';

import { useEffect, useCallback } from 'react';
import { useRealtimeStore } from '@/stores/realtime-store';
import { RealtimeEventType } from '@/lib/realtime';

export function useRealtime() {
  const { connected, subscribe, unsubscribe, getProviderType } = useRealtimeStore();

  const subscribeToEvent = useCallback(
    (eventType: string, callback: (data: any) => void) => {
      subscribe(eventType, callback);

      // Return unsubscribe function
      return () => {
        unsubscribe(eventType);
      };
    },
    [subscribe, unsubscribe],
  );

  return {
    connected,
    providerType: getProviderType(),
    subscribe: subscribeToEvent,
    unsubscribe,
  };
}

/**
 * Hook for subscribing to devlog events
 */
export function useDevlogEvents() {
  const { subscribe } = useRealtime();

  const onDevlogCreated = useCallback(
    (callback: (devlog: any) => void) => {
      return subscribe(RealtimeEventType.DEVLOG_CREATED, callback);
    },
    [subscribe],
  );

  const onDevlogUpdated = useCallback(
    (callback: (devlog: any) => void) => {
      return subscribe(RealtimeEventType.DEVLOG_UPDATED, callback);
    },
    [subscribe],
  );

  const onDevlogDeleted = useCallback(
    (callback: (data: { id: number }) => void) => {
      return subscribe(RealtimeEventType.DEVLOG_DELETED, callback);
    },
    [subscribe],
  );

  return {
    onDevlogCreated,
    onDevlogUpdated,
    onDevlogDeleted,
  };
}

/**
 * Hook for subscribing to project events
 */
export function useProjectEvents() {
  const { subscribe } = useRealtime();

  const onProjectCreated = useCallback(
    (callback: (project: any) => void) => {
      return subscribe(RealtimeEventType.PROJECT_CREATED, callback);
    },
    [subscribe],
  );

  const onProjectUpdated = useCallback(
    (callback: (project: any) => void) => {
      return subscribe(RealtimeEventType.PROJECT_UPDATED, callback);
    },
    [subscribe],
  );

  const onProjectDeleted = useCallback(
    (callback: (data: { id: number }) => void) => {
      return subscribe(RealtimeEventType.PROJECT_DELETED, callback);
    },
    [subscribe],
  );

  return {
    onProjectCreated,
    onProjectUpdated,
    onProjectDeleted,
  };
}

/**
 * Hook for subscribing to note events
 */
export function useNoteEvents() {
  const { subscribe } = useRealtime();

  const onNoteCreated = useCallback(
    (callback: (note: any) => void) => {
      return subscribe(RealtimeEventType.DEVLOG_NOTE_CREATED, callback);
    },
    [subscribe],
  );

  const onNoteUpdated = useCallback(
    (callback: (note: any) => void) => {
      return subscribe(RealtimeEventType.DEVLOG_NOTE_UPDATED, callback);
    },
    [subscribe],
  );

  const onNoteDeleted = useCallback(
    (callback: (data: { id: string }) => void) => {
      return subscribe(RealtimeEventType.DEVLOG_NOTE_DELETED, callback);
    },
    [subscribe],
  );

  return {
    onNoteCreated,
    onNoteUpdated,
    onNoteDeleted,
  };
}
