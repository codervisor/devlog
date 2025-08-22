'use client';

import { useEffect } from 'react';
import { initializeProjectStore } from '@/stores';

/**
 * Provider component that initializes Zustand stores and sets up real-time events
 * This replaces the need for React Context provider
 */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Initialize stores on mount
  useEffect(() => {
    initializeProjectStore();
  }, []);

  return <>{children}</>;
}
