import { useEffect, useState, useCallback, useMemo } from 'react';
import { DevlogEntry, DevlogId, DevlogFilter, PaginatedResult, PaginationMeta, DevlogStatus, FilterType } from '@devlog/core';
import { useServerSentEvents } from './useServerSentEvents';

export function useDevlogs() {
  const [devlogs, setDevlogs] = useState<DevlogEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
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
      filtered = filtered.filter(devlog => 
        filters.status!.includes(devlog.status)
      );
    }

    // Type filter
    if (filters.type && filters.type.length > 0) {
      filtered = filtered.filter(devlog => 
        filters.type!.includes(devlog.type)
      );
    }

    // Priority filter
    if (filters.priority && filters.priority.length > 0) {
      filtered = filtered.filter(devlog => 
        filters.priority!.includes(devlog.priority)
      );
    }

    // Assignee filter
    if (filters.assignee) {
      const assigneeQuery = filters.assignee.toLowerCase().trim();
      filtered = filtered.filter(devlog => 
        devlog.assignee?.toLowerCase().includes(assigneeQuery)
      );
    }

    // Date range filter (based on createdAt)
    if (filters.fromDate) {
      const fromDate = new Date(filters.fromDate);
      filtered = filtered.filter(devlog => 
        new Date(devlog.createdAt) >= fromDate
      );
    }

    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      // Include the entire end date by setting time to end of day
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(devlog => 
        new Date(devlog.createdAt) <= toDate
      );
    }

    // Search filter (client-side fallback for when backend search isn't used)
    if (filters.search) {
      const searchQuery = filters.search.toLowerCase().trim();
      filtered = filtered.filter(devlog => {
        const titleMatch = devlog.title.toLowerCase().includes(searchQuery);
        const descriptionMatch = devlog.description.toLowerCase().includes(searchQuery);
        const notesMatch = devlog.notes?.some(note => 
          note.content.toLowerCase().includes(searchQuery)
        ) || false;
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
  const handleStatusFilter = useCallback((status: FilterType) => {
    if (status === 'total') {
      // Clear all filters except search
      setFilters(prev => ({ search: prev.search }));
    } else if (status === 'open') {
      // Open includes: new, in-progress, blocked, in-review, testing
      const openStatuses: DevlogStatus[] = ['new', 'in-progress', 'blocked', 'in-review', 'testing'];
      setFilters(prev => ({
        ...prev,
        status: openStatuses,
      }));
    } else if (status === 'closed') {
      // Closed includes: done, cancelled
      const closedStatuses: DevlogStatus[] = ['done', 'cancelled'];
      setFilters(prev => ({
        ...prev,
        status: closedStatuses,
      }));
    } else {
      // Individual status - toggle behavior for direct status selection
      const currentStatuses = filters.status || [];
      if (currentStatuses.includes(status)) {
        // Remove this status
        const newStatuses = currentStatuses.filter(s => s !== status);
        setFilters(prev => ({
          ...prev,
          status: newStatuses.length > 0 ? newStatuses : undefined,
        }));
      } else {
        // Add this status (replace existing for single selection)
        setFilters(prev => ({
          ...prev,
          status: [status],
        }));
      }
    }
  }, [filters.status]);

  const handleSearchFilter = useCallback((searchQuery: string) => {
    setFilters(prev => ({
      ...prev,
      search: searchQuery.trim() || undefined,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Pagination utility functions
  const goToPage = useCallback((page: number) => {
    setFilters(prev => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        page,
      },
    }));
  }, []);

  const changePageSize = useCallback((limit: number) => {
    setFilters(prev => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        limit,
        page: 1, // Reset to first page when changing page size
      },
    }));
  }, []);

  const changeSorting = useCallback((sortBy: string, sortOrder?: 'asc' | 'desc') => {
    setFilters(prev => ({
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
