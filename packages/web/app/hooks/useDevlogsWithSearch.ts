import { useEffect, useState, useCallback, useMemo } from 'react';
import { DevlogEntry, DevlogId, DevlogFilter } from '@devlog/core';
import { useServerSentEvents } from './useServerSentEvents';

export function useDevlogsWithSearch() {
  const [devlogs, setDevlogs] = useState<DevlogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DevlogFilter>({});
  const { connected, subscribe, unsubscribe } = useServerSentEvents();

  // Build query string for API call
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    
    if (filters.search) {
      params.append('search', filters.search);
    }
    if (filters.status && filters.status.length > 0) {
      filters.status.forEach(status => params.append('status', status));
    }
    if (filters.type && filters.type.length > 0) {
      filters.type.forEach(type => params.append('type', type));
    }
    if (filters.priority && filters.priority.length > 0) {
      filters.priority.forEach(priority => params.append('priority', priority));
    }
    if (filters.assignee) {
      params.append('assignee', filters.assignee);
    }
    if (filters.fromDate) {
      params.append('fromDate', filters.fromDate);
    }
    if (filters.toDate) {
      params.append('toDate', filters.toDate);
    }
    
    return params.toString();
  }, [filters]);

  const fetchDevlogs = useCallback(async () => {
    try {
      setLoading(true);
      const url = `/api/devlogs${queryString ? `?${queryString}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch devlogs');
      }
      const data = await response.json();
      setDevlogs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  // Refetch when filters change
  useEffect(() => {
    fetchDevlogs();
  }, [fetchDevlogs]);

  // Set up real-time event listeners
  useEffect(() => {
    const handleDevlogCreated = (newDevlog: DevlogEntry) => {
      // Only add to current list if it matches current filters
      // For now, just refetch to ensure consistency
      fetchDevlogs();
    };

    const handleDevlogUpdated = (updatedDevlog: DevlogEntry) => {
      // Update if exists in current list, otherwise refetch
      setDevlogs(current => {
        const index = current.findIndex(devlog => devlog.id === updatedDevlog.id);
        if (index >= 0) {
          const updated = [...current];
          updated[index] = updatedDevlog;
          return updated;
        }
        // If not in current list, refetch to check if it should be included
        fetchDevlogs();
        return current;
      });
    };

    const handleDevlogDeleted = (deletedData: { id: DevlogId }) => {
      setDevlogs(current => 
        current.filter(devlog => devlog.id !== deletedData.id)
      );
    };

    // Subscribe to real-time events
    subscribe('devlog-created', handleDevlogCreated);
    subscribe('devlog-updated', handleDevlogUpdated);
    subscribe('devlog-deleted', handleDevlogDeleted);

    return () => {
      unsubscribe('devlog-created');
      unsubscribe('devlog-updated');
      unsubscribe('devlog-deleted');
    };
  }, [subscribe, unsubscribe, fetchDevlogs]);

  const createDevlog = async (data: Partial<DevlogEntry>) => {
    const response = await fetch('/api/devlogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create devlog');
    }

    return await response.json();
  };

  const updateDevlog = async (data: Partial<DevlogEntry> & { id: DevlogId }) => {
    const response = await fetch(`/api/devlogs/${data.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update devlog');
    }

    return await response.json();
  };

  const deleteDevlog = async (id: DevlogId) => {
    const response = await fetch(`/api/devlogs/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete devlog');
    }
  };

  const batchUpdate = async (ids: DevlogId[], updates: any) => {
    const response = await fetch('/api/devlogs/batch/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids, updates }),
    });

    if (!response.ok) {
      throw new Error('Failed to batch update devlogs');
    }

    await fetchDevlogs();
    return await response.json();
  };

  const batchDelete = async (ids: DevlogId[]) => {
    const response = await fetch('/api/devlogs/batch/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      throw new Error('Failed to batch delete devlogs');
    }

    await fetchDevlogs();
  };

  const batchAddNote = async (ids: DevlogId[], content: string, category?: string) => {
    const response = await fetch('/api/devlogs/batch/note', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids, content, category }),
    });

    if (!response.ok) {
      throw new Error('Failed to batch add notes');
    }

    await fetchDevlogs();
    return await response.json();
  };

  return {
    devlogs,
    loading,
    error,
    connected,
    filters,
    setFilters,
    refetch: fetchDevlogs,
    createDevlog,
    updateDevlog,
    deleteDevlog,
    batchUpdate,
    batchDelete,
    batchAddNote,
  };
}
