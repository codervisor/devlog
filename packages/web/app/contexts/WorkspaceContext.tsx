'use client';

import { useState, useEffect, useContext, createContext } from 'react';
import { useWorkspaceStorage } from '@/hooks/use-workspace-storage';

interface WorkspaceMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  lastAccessedAt: string;
  settings?: {
    defaultPriority?: 'low' | 'medium' | 'high' | 'critical';
    theme?: string;
    autoArchiveDays?: number;
  };
}

interface WorkspaceContext {
  workspaceId: string;
  workspace: WorkspaceMetadata;
  isDefault: boolean;
}

interface WorkspaceContextType {
  currentWorkspace: WorkspaceContext | null;
  workspaces: WorkspaceMetadata[];
  loading: boolean;
  error: string | null;
  refreshWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (workspace: WorkspaceContext) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceContext | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { storedWorkspaceId, isLoaded } = useWorkspaceStorage();

  const refreshWorkspaces = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/workspaces');
      if (!response.ok) {
        throw new Error('Failed to fetch workspaces');
      }
      
      const data = await response.json();
      setWorkspaces(data.workspaces);
      
      // Use localStorage to determine current workspace, fallback to server's default
      const targetWorkspaceId = storedWorkspaceId || data.currentWorkspace?.workspaceId || 'default';
      const targetWorkspace = data.workspaces.find((ws: WorkspaceMetadata) => ws.id === targetWorkspaceId);
      
      if (targetWorkspace) {
        setCurrentWorkspace({
          workspaceId: targetWorkspace.id,
          workspace: targetWorkspace,
          isDefault: targetWorkspace.id === 'default'
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching workspaces:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded) {
      refreshWorkspaces();
    }
  }, [isLoaded, storedWorkspaceId]);

  const value: WorkspaceContextType = {
    currentWorkspace,
    workspaces,
    loading,
    error,
    refreshWorkspaces,
    setCurrentWorkspace,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
