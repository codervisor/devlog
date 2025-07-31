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
    if (!projectId || !devlogClient) {
      setError('No project ID available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Convert query string to filters object for DevlogApiClient
      const urlParams = new URLSearchParams(queryString);
      const filters: DevlogFilters = {};

      if (urlParams.get('status')) filters.status = urlParams.get('status') as DevlogStatus;
      if (urlParams.get('priority')) filters.priority = urlParams.get('priority') as DevlogPriority;
      if (urlParams.get('type')) filters.type = urlParams.get('type') as DevlogType;
      if (urlParams.get('search')) filters.search = urlParams.get('search')!;
      if (urlParams.get('limit')) filters.limit = parseInt(urlParams.get('limit')!, 10);
      if (urlParams.get('offset')) filters.offset = parseInt(urlParams.get('offset')!, 10);
      if (urlParams.getAll('tags').length) filters.tags = urlParams.getAll('tags');

      const data = await devlogClient.list(filters);

      // Handle both collection response and direct array response
      setDevlogs(data);
      setPagination(null); // Simple implementation for now

      setError(null);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [queryString, projectId, devlogClient]);

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
