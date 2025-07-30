import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  DevlogEntry,
  DevlogId,
  DevlogFilter,
  PaginatedResult,
  PaginationMeta,
  DevlogStatus,
  FilterType,
} from '@codervisor/devlog-core';
import { useServerSentEvents } from './useServerSentEvents';

interface UseProjectIndependentDevlogsResult {
  devlogs: DevlogEntry[];
  filteredDevlogs: DevlogEntry[];
  pagination: PaginationMeta | null;
  loading: boolean;
  error: string | null;
  filters: DevlogFilter;
  connected: boolean;
  setFilters: (filters: DevlogFilter | ((prev: DevlogFilter) => DevlogFilter)) => void;
  fetchDevlogs: () => Promise<void>;
  createDevlog: (data: Partial<DevlogEntry>) => Promise<any>;
  updateDevlog: (data: Partial<DevlogEntry> & { id: DevlogId }) => Promise<any>;
  deleteDevlog: (id: DevlogId) => Promise<void>;
  batchUpdate: (ids: DevlogId[], updates: any) => Promise<any>;
  batchDelete: (ids: DevlogId[]) => Promise<void>;
  batchAddNote: (ids: DevlogId[], content: string, category?: string) => Promise<any>;
  goToPage: (page: number) => void;
  changePageSize: (pageSize: number) => void;
  handleStatusFilter: (filterValue: FilterType | DevlogStatus) => void;
}

/**
 * Hook for managing devlogs data independently of project context
 * This hook directly uses the projectId without waiting for the project context to load
 */
export function useProjectIndependentDevlogs(
  projectId: number,
): UseProjectIndependentDevlogsResult {
  const [devlogs, setDevlogs] = useState<DevlogEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DevlogFilter>({
    pagination: {
      page: 1,
      limit: 20,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    },
  });

  const { connected, subscribe, unsubscribe } = useServerSentEvents();

  // Build query string for API call
  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (filters.search) {
      params.append('search', filters.search);
    }

    if (filters.filterType) {
      params.append('filterType', filters.filterType);
    }

    if (filters.status && filters.status.length > 0) {
      filters.status.forEach((status) => params.append('status', status));
    }

    if (filters.type && filters.type.length > 0) {
      filters.type.forEach((type) => params.append('type', type));
    }
    if (filters.priority && filters.priority.length > 0) {
      filters.priority.forEach((priority) => params.append('priority', priority));
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

    if (filters.pagination?.page) {
      params.append('page', filters.pagination.page.toString());
    }
    if (filters.pagination?.limit) {
      params.append('limit', filters.pagination.limit.toString());
    }
    if (filters.pagination?.sortBy) {
      params.append('sortBy', filters.pagination.sortBy);
    }
    if (filters.pagination?.sortOrder) {
      params.append('sortOrder', filters.pagination.sortOrder);
    }

    return params.toString();
  }, [filters]);

  const fetchDevlogs = useCallback(async () => {
    try {
      setLoading(true);
      const url = `/api/projects/${projectId}/devlogs${queryString ? `?${queryString}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch devlogs');
      }
      const data = await response.json();

      if (data && typeof data === 'object' && 'items' in data && 'pagination' in data) {
        setDevlogs(data.items);
        setPagination(data.pagination);
      } else {
        setDevlogs(data);
        setPagination(null);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [queryString, projectId]);

  // Client-side filtered devlogs
  const filteredDevlogs = useMemo(() => {
    if (queryString) {
      return devlogs;
    }

    let filtered = [...devlogs];

    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter((devlog) => filters.status!.includes(devlog.status));
    }

    if (filters.type && filters.type.length > 0) {
      filtered = filtered.filter((devlog) => filters.type!.includes(devlog.type));
    }

    if (filters.priority && filters.priority.length > 0) {
      filtered = filtered.filter((devlog) => filters.priority!.includes(devlog.priority));
    }

    if (filters.assignee) {
      filtered = filtered.filter((devlog) => devlog.assignee === filters.assignee);
    }

    if (filters.fromDate) {
      const fromDate = new Date(filters.fromDate);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((devlog) => new Date(devlog.createdAt) >= fromDate);
    }

    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((devlog) => new Date(devlog.createdAt) <= toDate);
    }

    if (filters.search) {
      const searchQuery = filters.search.toLowerCase().trim();
      filtered = filtered.filter((devlog) => {
        const titleMatch = devlog.title.toLowerCase().includes(searchQuery);
        const descriptionMatch = devlog.description.toLowerCase().includes(searchQuery);
        const notesMatch =
          devlog.notes?.some((note) => note.content.toLowerCase().includes(searchQuery)) || false;
        return titleMatch || descriptionMatch || notesMatch;
      });
    }

    return filtered;
  }, [devlogs, filters, queryString]);

  // CRUD operations
  const createDevlog = async (data: Partial<DevlogEntry>) => {
    const response = await fetch(`/api/projects/${projectId}/devlogs`, {
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
    const response = await fetch(`/api/projects/${projectId}/devlogs/${data.id}`, {
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
    // Optimistically remove from state immediately to prevent race conditions
    setDevlogs((current) => current.filter((devlog) => devlog.id !== id));

    try {
      const response = await fetch(`/api/projects/${projectId}/devlogs/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // If the API call fails, restore the item to state
        await fetchDevlogs();
        throw new Error('Failed to delete devlog');
      }
    } catch (error) {
      // If there's an error, refresh the list to restore correct state
      await fetchDevlogs();
      throw error;
    }
  };

  // Batch operations
  const batchUpdate = async (ids: DevlogId[], updates: any) => {
    const response = await fetch(`/api/projects/${projectId}/devlogs/batch/update`, {
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
    const response = await fetch(`/api/projects/${projectId}/devlogs/batch/delete`, {
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
    const response = await fetch(`/api/projects/${projectId}/devlogs/batch/note`, {
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

  // Pagination actions
  const goToPage = (page: number) => {
    setFilters((prev) => ({
      ...prev,
      pagination: {
        ...prev.pagination!,
        page,
      },
    }));
  };

  const changePageSize = (limit: number) => {
    setFilters((prev) => ({
      ...prev,
      pagination: {
        ...prev.pagination!,
        limit,
        page: 1, // Reset to first page when changing page size
      },
    }));
  };

  // Filter handling functions
  const handleStatusFilter = useCallback((filterValue: FilterType | DevlogStatus) => {
    if (['total', 'open', 'closed'].includes(filterValue)) {
      setFilters((prev) => ({
        ...prev,
        filterType: filterValue,
        status: undefined,
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        filterType: undefined,
        status: [filterValue as DevlogStatus],
      }));
    }
  }, []);

  // Fetch data on mount and filter changes
  useEffect(() => {
    fetchDevlogs();
  }, [fetchDevlogs]);

  // Set up real-time event listeners
  useEffect(() => {
    const handleDevlogCreated = (newDevlog: DevlogEntry) => {
      fetchDevlogs();
    };

    const handleDevlogUpdated = (updatedDevlog: DevlogEntry) => {
      setDevlogs((current) => {
        const index = current.findIndex((devlog) => devlog.id === updatedDevlog.id);
        if (index >= 0) {
          const updated = [...current];
          updated[index] = updatedDevlog;
          return updated;
        }
        fetchDevlogs();
        return current;
      });
    };

    const handleDevlogDeleted = (deletedData: { id: DevlogId }) => {
      setDevlogs((current) => current.filter((devlog) => devlog.id !== deletedData.id));
    };

    subscribe('devlog-created', handleDevlogCreated);
    subscribe('devlog-updated', handleDevlogUpdated);
    subscribe('devlog-deleted', handleDevlogDeleted);

    return () => {
      unsubscribe('devlog-created');
      unsubscribe('devlog-updated');
      unsubscribe('devlog-deleted');
    };
  }, [subscribe, unsubscribe, fetchDevlogs]);

  return {
    devlogs,
    filteredDevlogs,
    pagination,
    loading,
    error,
    filters,
    connected,
    setFilters,
    fetchDevlogs,
    createDevlog,
    updateDevlog,
    deleteDevlog,
    batchUpdate,
    batchDelete,
    batchAddNote,
    goToPage,
    changePageSize,
    handleStatusFilter,
  };
}
