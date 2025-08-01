'use client';

import { useEffect } from 'react';
import { initializeProjectStore, useRealtime, useDevlogStore } from '@/stores';

/**
 * Provider component that initializes Zustand stores and sets up real-time events
 * This replaces the need for React Context providers
 */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { connected, subscribe, unsubscribe } = useRealtime();
  const { setConnected, handleDevlogCreated, handleDevlogUpdated, handleDevlogDeleted } =
    useDevlogStore();

  // Initialize stores on mount
  useEffect(() => {
    initializeProjectStore();
  }, []);

  // Set up real-time event listeners
  useEffect(() => {
    setConnected(connected);
  }, [connected, setConnected]);

  useEffect(() => {
    subscribe('devlog-created', handleDevlogCreated);
    subscribe('devlog-updated', handleDevlogUpdated);
    subscribe('devlog-deleted', handleDevlogDeleted);

    return () => {
      unsubscribe('devlog-created');
      unsubscribe('devlog-updated');
      unsubscribe('devlog-deleted');
    };
  }, [subscribe, unsubscribe, handleDevlogCreated, handleDevlogUpdated, handleDevlogDeleted]);

  return <>{children}</>;
}
