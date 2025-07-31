import { useEffect, useState, useCallback, useMemo } from 'react';
import { DevlogEntry, DevlogId } from '@codervisor/devlog-core';
import { useServerSentEvents } from './useServerSentEvents';
import { useProject } from '@/contexts/ProjectContext';
import { DevlogApiClient, handleApiError } from '@/lib';

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

  // Create DevlogApiClient instance
  const devlogClient = useMemo(() => {
    return projectId ? new DevlogApiClient(projectId.toString()) : null;
  }, [projectId]);

  const fetchDevlog = useCallback(async () => {
    if (isNaN(devlogId)) {
      setError('Invalid devlog ID');
      setLoading(false);
      return;
    }

    if (!projectId || !devlogClient) {
      setError('No project ID available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await devlogClient.get(devlogId);
      setDevlog(data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [devlogId, projectId, devlogClient]);

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
      if (!projectId || !devlogClient) {
        throw new Error('No project ID available');
      }

      const updatedDevlog = await devlogClient.update(data.id, data);

      setDevlog(updatedDevlog);
      return updatedDevlog;
    },
    [projectId, devlogClient],
  );

  const deleteDevlog = useCallback(
    async (id: DevlogId) => {
      if (!projectId || !devlogClient) {
        throw new Error('No project ID available');
      }

      await devlogClient.delete(id);
      setDevlog(null);
    },
    [projectId, devlogClient],
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
