import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  DevlogEntry,
  DevlogId,
  DevlogFilter,
  PaginatedResult,
  PaginationMeta,
  DevlogStatus,
  DevlogPriority,
  DevlogType,
  FilterType,
} from '@codervisor/devlog-core';
import { useServerSentEvents } from './useServerSentEvents';
import { useProject } from '@/contexts/ProjectContext';
import { useDevlogContext } from '@/contexts/DevlogContext';
import { DevlogApiClient, DevlogFilters, handleApiError } from '@/lib';
import type { CollectionResponse } from '@/schemas/responses';

interface UseDevlogDataOptions {
  /**
   * Project ID to use. If not provided, will use the current project from context.
   * If provided, will bypass context and use the explicit project ID.
   */
  projectId?: number;

  /**
   * Whether to use the DevlogContext for shared state management.
   * Only works when projectId is not provided.
   * @default true
   */
  useContext?: boolean;
}

interface UseDevlogDataResult {
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
 * Unified hook for managing devlogs data.
 * Can work with or without DevlogContext, and with explicit project IDs.
 */
export function useDevlogData(options: UseDevlogDataOptions = {}): UseDevlogDataResult {
  const { projectId: explicitProjectId, useContext = true } = options;

  // Try to get context data
  const { currentProject } = useProject();
  const contextData = useContext && !explicitProjectId ? useDevlogContext() : null;

  // Determine the actual project ID to use
  const projectId = explicitProjectId || currentProject?.projectId;

  // Create DevlogApiClient instance
  const devlogClient = useMemo(() => {
    return projectId ? new DevlogApiClient(projectId.toString()) : null;
  }, [projectId]);

  // If we should use context and have context data, return it
  if (contextData && !explicitProjectId) {
    return {
      devlogs: contextData.devlogs,
      filteredDevlogs: contextData.filteredDevlogs,
      pagination: contextData.pagination,
      loading: contextData.loading,
      error: contextData.error,
      filters: contextData.filters,
      connected: contextData.connected,
      setFilters: contextData.setFilters,
      fetchDevlogs: contextData.fetchDevlogs,
      createDevlog: contextData.createDevlog,
      updateDevlog: contextData.updateDevlog,
      deleteDevlog: contextData.deleteDevlog,
      batchUpdate: contextData.batchUpdate,
      batchDelete: contextData.batchDelete,
      batchAddNote: contextData.batchAddNote,
      goToPage: contextData.goToPage,
      changePageSize: contextData.changePageSize,
      handleStatusFilter: contextData.handleStatusFilter,
    };
  }

  // Otherwise, implement standalone logic
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

  // Build query string for API call - now handles all filter parameters
  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    // Search
    if (filters.search) {
      params.append('search', filters.search);
    }

    // Filter type (for backwards compatibility)
    if (filters.filterType) {
      params.append('filterType', filters.filterType);
    }

    // Status filter - convert array to single value for API
    if (filters.status && filters.status.length > 0) {
      // API expects single status value, take the first one
      params.append('status', filters.status[0]);
    }

    // Type filter - convert array to single value for API
    if (filters.type && filters.type.length > 0) {
      params.append('type', filters.type[0]);
    }

    // Priority filter - convert array to single value for API
    if (filters.priority && filters.priority.length > 0) {
      params.append('priority', filters.priority[0]);
    }

    // Assignee filter
    if (filters.assignee) {
      params.append('assignee', filters.assignee);
    }

    // Date range filters
    if (filters.fromDate) {
      params.append('fromDate', filters.fromDate);
    }
    if (filters.toDate) {
      params.append('toDate', filters.toDate);
    }

    // Archived filter
    if (filters.archived !== undefined) {
      params.append('archived', filters.archived.toString());
    }

    // Pagination
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
    if (!projectId || !devlogClient) {
      setError('No project ID available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Convert filters to DevlogFilters format for the API client
      const apiFilters: DevlogFilters = {};

      // Convert array filters to single values (API expects single values currently)
      if (filters.status && filters.status.length > 0) {
        apiFilters.status = filters.status[0] as DevlogStatus;
      }
      if (filters.priority && filters.priority.length > 0) {
        apiFilters.priority = filters.priority[0] as DevlogPriority;
      }
      if (filters.type && filters.type.length > 0) {
        apiFilters.type = filters.type[0] as DevlogType;
      }

      // Direct mappings
      if (filters.search) apiFilters.search = filters.search;
      if (filters.assignee) apiFilters.assignee = filters.assignee;
      if (filters.archived !== undefined) apiFilters.archived = filters.archived;
      if (filters.fromDate) apiFilters.fromDate = filters.fromDate;
      if (filters.toDate) apiFilters.toDate = filters.toDate;

      // Handle filterType - only pass through valid values
      if (filters.filterType && ['total', 'open', 'closed'].includes(filters.filterType)) {
        apiFilters.filterType = filters.filterType as 'total' | 'open' | 'closed';
      }

      // Pagination
      if (filters.pagination) {
        if (filters.pagination.page) apiFilters.page = filters.pagination.page;
        if (filters.pagination.limit) apiFilters.limit = filters.pagination.limit;
        if (filters.pagination.sortBy) apiFilters.sortBy = filters.pagination.sortBy;
        if (filters.pagination.sortOrder) apiFilters.sortOrder = filters.pagination.sortOrder;
      }

      const data = await devlogClient.list(apiFilters);

      // Handle both collection response and direct array response
      setDevlogs(data);
      setPagination(null); // Simple implementation for now

      setError(null);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [filters, projectId, devlogClient]);

  // All filtering is now handled server-side - simply return the devlogs from API
  const filteredDevlogs = useMemo(() => {
    return devlogs;
  }, [devlogs]);

  // CRUD operations
  const createDevlog = async (data: Partial<DevlogEntry>) => {
    if (!projectId || !devlogClient) {
      throw new Error('No project ID available');
    }

    return devlogClient.create(data as any); // Type assertion for compatibility
  };

  const updateDevlog = async (data: Partial<DevlogEntry> & { id: DevlogId }) => {
    if (!projectId || !devlogClient) {
      throw new Error('No project ID available');
    }

    return devlogClient.update(data.id, data);
  };

  const deleteDevlog = async (id: DevlogId) => {
    if (!projectId || !devlogClient) {
      throw new Error('No project ID available');
    }

    // Optimistically remove from state immediately to prevent race conditions
    setDevlogs((current) => current.filter((devlog) => devlog.id !== id));

    try {
      await devlogClient.delete(id);
    } catch (error) {
      // If there's an error, refresh the list to restore correct state
      await fetchDevlogs();
      throw error;
    }
  };

  // Batch operations
  const batchUpdate = async (ids: DevlogId[], updates: any) => {
    if (!projectId || !devlogClient) {
      throw new Error('No project ID available');
    }

    const result = await devlogClient.batchUpdate(ids, updates);

    await fetchDevlogs();
    return result;
  };

  const batchDelete = async (ids: DevlogId[]) => {
    if (!projectId || !devlogClient) {
      throw new Error('No project ID available');
    }

    await devlogClient.batchDelete(ids);

    await fetchDevlogs();
  };

  const batchAddNote = async (ids: DevlogId[], content: string, category?: string) => {
    if (!projectId || !devlogClient) {
      throw new Error('No project ID available');
    }

    const result = await devlogClient.batchAddNote(ids, { content, category });

    await fetchDevlogs();
    return result;
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

  // Fetch data on mount and filter changes (only if not using context)
  useEffect(() => {
    if (!contextData) {
      fetchDevlogs();
    }
  }, [fetchDevlogs, contextData]);

  // Set up real-time event listeners (only if not using context)
  useEffect(() => {
    if (contextData) return;

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
  }, [subscribe, unsubscribe, fetchDevlogs, contextData]);

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
