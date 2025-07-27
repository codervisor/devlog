import { useEffect, useState, useCallback } from 'react';
import { DevlogEntry, DevlogId } from '@codervisor/devlog-core';
import { useServerSentEvents } from './useServerSentEvents';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface UseDevlogDetailsResult {
  devlog: DevlogEntry | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateDevlog: (data: Partial<DevlogEntry> & { id: DevlogId }) => Promise<DevlogEntry>;
  deleteDevlog: (id: DevlogId) => Promise<void>;
}

export function useDevlogDetails(id: string | number): UseDevlogDetailsResult {
  const [devlog, setDevlog] = useState<DevlogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { connected, subscribe, unsubscribe } = useServerSentEvents();
  const { currentWorkspace } = useWorkspace();

  const devlogId = typeof id === 'string' ? parseInt(id, 10) : id;

  const fetchDevlog = useCallback(async () => {
    if (isNaN(devlogId)) {
      setError('Invalid devlog ID');
      setLoading(false);
      return;
    }

    if (!currentWorkspace) {
      setError('No workspace selected');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/workspaces/${currentWorkspace.workspaceId}/devlogs/${devlogId}`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          setError('Devlog not found');
        } else {
          throw new Error('Failed to fetch devlog');
        }
        return;
      }

      const data = await response.json();
      setDevlog(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [devlogId, currentWorkspace]);

  // Set up real-time event listeners for this specific devlog
  useEffect(() => {
    const handleDevlogUpdated = (updatedDevlog: DevlogEntry) => {
      if (updatedDevlog.id === devlogId) {
        setDevlog(updatedDevlog);
      }
    };

    const handleDevlogDeleted = (deletedData: { id: DevlogId }) => {
      if (deletedData.id === devlogId) {
        setDevlog(null);
        setError('Devlog has been deleted');
      }
    };

    // Subscribe to real-time events
    subscribe('devlog-updated', handleDevlogUpdated);
    subscribe('devlog-deleted', handleDevlogDeleted);

    return () => {
      unsubscribe('devlog-updated');
      unsubscribe('devlog-deleted');
    };
  }, [subscribe, unsubscribe, devlogId]);

  // Initial fetch
  useEffect(() => {
    fetchDevlog();
  }, [fetchDevlog]);

  // CRUD operations for this specific devlog
  const updateDevlog = useCallback(
    async (data: Partial<DevlogEntry> & { id: DevlogId }) => {
      if (!currentWorkspace) {
        throw new Error('No workspace selected');
      }

      const response = await fetch(
        `/api/workspaces/${currentWorkspace.workspaceId}/devlogs/${data.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to update devlog');
      }

      const updatedDevlog = await response.json();
      setDevlog(updatedDevlog);
      return updatedDevlog;
    },
    [currentWorkspace],
  );

  const deleteDevlog = useCallback(
    async (id: DevlogId) => {
      if (!currentWorkspace) {
        throw new Error('No workspace selected');
      }

      const response = await fetch(
        `/api/workspaces/${currentWorkspace.workspaceId}/devlogs/${id}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to delete devlog');
      }

      setDevlog(null);
    },
    [currentWorkspace],
  );

  return {
    devlog,
    loading,
    error,
    refetch: fetchDevlog,
    updateDevlog,
    deleteDevlog,
  };
}
