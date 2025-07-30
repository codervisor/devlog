import { useEffect, useState, useCallback } from 'react';
import { DevlogEntry, DevlogId } from '@codervisor/devlog-core';
import { useServerSentEvents } from './useServerSentEvents';
import { useProject } from '@/contexts/ProjectContext';
import { apiClient, handleApiError } from '@/lib/api-client';

interface UseDevlogDetailsOptions {
  /**
   * Project ID to use. If not provided, will use the current project from context.
   */
  projectId?: number;
}

interface UseDevlogDetailsResult {
  devlog: DevlogEntry | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateDevlog: (data: Partial<DevlogEntry> & { id: DevlogId }) => Promise<DevlogEntry>;
  deleteDevlog: (id: DevlogId) => Promise<void>;
}

/**
 * Unified hook for fetching and managing devlog details.
 * Can work with explicit project IDs or use project context.
 */
export function useDevlogDetails(
  id: string | number,
  options: UseDevlogDetailsOptions = {},
): UseDevlogDetailsResult {
  const { projectId: explicitProjectId } = options;
  const [devlog, setDevlog] = useState<DevlogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { connected, subscribe, unsubscribe } = useServerSentEvents();
  const { currentProject } = useProject();

  const devlogId = typeof id === 'string' ? parseInt(id, 10) : id;
  const projectId = explicitProjectId || currentProject?.projectId;

  const fetchDevlog = useCallback(async () => {
    if (isNaN(devlogId)) {
      setError('Invalid devlog ID');
      setLoading(false);
      return;
    }

    if (!projectId) {
      setError('No project ID available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await apiClient.get<DevlogEntry>(
        `/api/projects/${projectId}/devlogs/${devlogId}`,
      );
      setDevlog(data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [devlogId, projectId]);

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
      if (!projectId) {
        throw new Error('No project ID available');
      }

      const updatedDevlog = await apiClient.put<DevlogEntry>(
        `/api/projects/${projectId}/devlogs/${data.id}`,
        data,
      );

      setDevlog(updatedDevlog);
      return updatedDevlog;
    },
    [projectId],
  );

  const deleteDevlog = useCallback(
    async (id: DevlogId) => {
      if (!projectId) {
        throw new Error('No project ID available');
      }

      await apiClient.delete<void>(`/api/projects/${projectId}/devlogs/${id}`);
      setDevlog(null);
    },
    [projectId],
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
