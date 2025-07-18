import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  DevlogEntry,
  DevlogId,
  DevlogFilter,
  PaginatedResult,
  PaginationMeta,
  DevlogStatus,
  FilterType,
} from '@devlog/core';
import { useServerSentEvents } from './useServerSentEvents';

export function useDevlogs() {
  const [devlogs, setDevlogs] = useState<DevlogEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DevlogFilter>({
    // Set default pagination
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

    // Add filterType parameter for status grouping
    if (filters.filterType) {
      params.append('filterType', filters.filterType);
    }

    // Add specific status filters (work with filterType)
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

    // Add pagination parameters
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
      const url = `/api/devlogs${queryString ? `?${queryString}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch devlogs');
      }
      const data = await response.json();

      // Handle both paginated and non-paginated responses
      if (data && typeof data === 'object' && 'items' in data && 'pagination' in data) {
        // Paginated response
        setDevlogs(data.items);
        setPagination(data.pagination);
      } else {
        // Non-paginated response (array of entries)
        setDevlogs(data);
        setPagination(null);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  // Client-side filtered devlogs (for when server-side filtering isn't sufficient)
  const filteredDevlogs = useMemo(() => {
    // If we have server-side filtering active (via API), return devlogs as-is
    // Otherwise, apply client-side filtering as fallback
    if (queryString) {
      return devlogs;
    }

    let filtered = [...devlogs];

    // Status filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter((devlog) => filters.status!.includes(devlog.status));
    }

    // Type filter
    if (filters.type && filters.type.length > 0) {
      filtered = filtered.filter((devlog) => filters.type!.includes(devlog.type));
    }

    // Priority filter
    if (filters.priority && filters.priority.length > 0) {
      filtered = filtered.filter((devlog) => filters.priority!.includes(devlog.priority));
    }

    // Assignee filter
    if (filters.assignee) {
      const assigneeQuery = filters.assignee.toLowerCase().trim();
      filtered = filtered.filter((devlog) =>
        devlog.assignee?.toLowerCase().includes(assigneeQuery),
      );
    }

    // Date range filter (based on createdAt)
    if (filters.fromDate) {
      const fromDate = new Date(filters.fromDate);
      filtered = filtered.filter((devlog) => new Date(devlog.createdAt) >= fromDate);
    }

    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      // Include the entire end date by setting time to end of day
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((devlog) => new Date(devlog.createdAt) <= toDate);
    }

    // Search filter (client-side fallback for when backend search isn't used)
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
      setDevlogs((current) => {
        const index = current.findIndex((devlog) => devlog.id === updatedDevlog.id);
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
      setDevlogs((current) => current.filter((devlog) => devlog.id !== deletedData.id));
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

  // CRUD operations
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

  // Batch operations
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

  // Filter handling functions
  const handleStatusFilter = useCallback(
    (filterValue: FilterType | DevlogStatus) => {
      if (['total', 'open', 'closed'].includes(filterValue)) {
        setFilters((prev) => ({
          ...prev,
          filterType: filterValue,
          status: undefined,
        }));
      } else {
        // Individual status - set filterType to corresponding group and specific status
        const currentStatuses = filters.status || [];

        // Check if this is already the only selected status
        if (currentStatuses.length === 1 && currentStatuses[0] === filterValue) {
          // If clicking the same single status, clear status only
          setFilters((prev) => ({
            ...prev,
            status: undefined,
          }));
        } else {
          // Determine the correct filterType based on the status
          const openStatuses: DevlogStatus[] = [
            'new',
            'in-progress',
            'blocked',
            'in-review',
            'testing',
          ];
          const closedStatuses: DevlogStatus[] = ['done', 'cancelled'];

          let correspondingFilterType: 'open' | 'closed';
          if (openStatuses.includes(filterValue as DevlogStatus)) {
            correspondingFilterType = 'open';
          } else if (closedStatuses.includes(filterValue as DevlogStatus)) {
            correspondingFilterType = 'closed';
          } else {
            // Fallback - shouldn't happen with current status types
            correspondingFilterType = 'open';
          }

          // Set specific status and corresponding filterType
          setFilters((prev) => ({
            ...prev,
            filterType: correspondingFilterType,
            status: [filterValue as DevlogStatus],
          }));
        }
      }
    },
    [filters.status],
  );

  const handleSearchFilter = useCallback((searchQuery: string) => {
    setFilters((prev) => ({
      ...prev,
      search: searchQuery.trim() || undefined,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Pagination utility functions
  const goToPage = useCallback((page: number) => {
    setFilters((prev) => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        page,
      },
    }));
  }, []);

  const changePageSize = useCallback((limit: number) => {
    setFilters((prev) => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        limit,
        page: 1, // Reset to first page when changing page size
      },
    }));
  }, []);

  const changeSorting = useCallback((sortBy: string, sortOrder?: 'asc' | 'desc') => {
    setFilters((prev) => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        sortBy: sortBy as any,
        sortOrder: sortOrder || 'desc',
      },
    }));
  }, []);

  return {
    // Data
    devlogs: filteredDevlogs,
    pagination,
    loading,
    error,
    connected,

    // Current filters
    filters,
    setFilters,

    // Filter actions
    handleStatusFilter,
    handleSearchFilter,
    resetFilters,

    // Data actions
    refetch: fetchDevlogs,
    createDevlog,
    updateDevlog,
    deleteDevlog,
    batchUpdate,
    batchDelete,
    batchAddNote,

    // Pagination controls
    goToPage,
    changePageSize,
    changeSorting,
  };
}
