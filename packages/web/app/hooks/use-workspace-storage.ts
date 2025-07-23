'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'devlog-current-workspace';

/**
 * Hook for managing current workspace persistence in localStorage
 * Handles cases where stored workspace no longer exists
 */
export function useWorkspaceStorage() {
  const [storedWorkspaceId, setStoredWorkspaceId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load workspace ID from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setStoredWorkspaceId(stored);
      }
    } catch (error) {
      console.warn('Failed to load workspace from localStorage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Function to persist workspace ID to localStorage
  const saveWorkspaceId = (workspaceId: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, workspaceId);
      setStoredWorkspaceId(workspaceId);
    } catch (error) {
      console.error('Failed to save workspace to localStorage:', error);
    }
  };

  // Function to clear workspace from localStorage
  const clearWorkspaceId = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setStoredWorkspaceId(null);
    } catch (error) {
      console.error('Failed to clear workspace from localStorage:', error);
    }
  };

  return {
    storedWorkspaceId,
    isLoaded,
    saveWorkspaceId,
    clearWorkspaceId,
  };
}
