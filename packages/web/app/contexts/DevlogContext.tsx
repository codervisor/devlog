'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import {
  DevlogEntry,
  DevlogId,
  DevlogFilter,
  PaginatedResult,
  PaginationMeta,
  DevlogStatus,
  FilterType,
  DevlogStats,
  TimeSeriesStats,
} from '@codervisor/devlog-core';
import { useServerSentEvents } from '../hooks/useServerSentEvents';
import { useProject } from './ProjectContext';
import { DevlogApiClient, NoteApiClient, handleApiError } from '@/lib';
import type { CollectionResponse } from '@/schemas/responses';

interface DevlogContextType {
  // Devlogs state
  devlogs: DevlogEntry[];
  pagination: PaginationMeta | null;
  loading: boolean;
  error: string | null;
  filters: DevlogFilter;
  filteredDevlogs: DevlogEntry[];
  connected: boolean;

  // Stats state
  stats: DevlogStats | null;
  statsLoading: boolean;
  statsError: string | null;

  // Time series stats state
  timeSeriesStats: TimeSeriesStats | null;
  timeSeriesLoading: boolean;
  timeSeriesError: string | null;

  // Actions
  setFilters: (filters: DevlogFilter | ((prev: DevlogFilter) => DevlogFilter)) => void;
  fetchDevlogs: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchTimeSeriesStats: () => Promise<void>;
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

const DevlogContext = createContext<DevlogContextType | undefined>(undefined);

export function DevlogProvider({ children }: { children: React.ReactNode }) {
  // Project context
  const { currentProject } = useProject();

  // Devlogs state
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

  // Stats state
  const [stats, setStats] = useState<DevlogStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const hasStatsFetched = useRef(false);

  // Time series stats state
  const [timeSeriesStats, setTimeSeriesStats] = useState<TimeSeriesStats | null>(null);
  const [timeSeriesLoading, setTimeSeriesLoading] = useState(true);
  const [timeSeriesError, setTimeSeriesError] = useState<string | null>(null);
  const hasTimeSeriesFetched = useRef(false);

  const { connected, subscribe, unsubscribe } = useServerSentEvents();

  // Create DevlogApiClient instance
  const devlogApiClient = useMemo(() => {
    return currentProject ? new DevlogApiClient(currentProject.projectId.toString()) : null;
  }, [currentProject]);

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
    // Don't fetch if no current project or devlog client is available
    if (!currentProject || !devlogApiClient) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Convert filters to DevlogFilters format for the API client
      const apiFilters: any = {};

      // Convert array filters to single values (API expects single values currently)
      if (filters.status && filters.status.length > 0) {
        apiFilters.status = filters.status[0];
      }
      if (filters.type && filters.type.length > 0) {
        apiFilters.type = filters.type[0];
      }
      if (filters.priority && filters.priority.length > 0) {
        apiFilters.priority = filters.priority[0];
      }

      // Direct mappings
      if (filters.search) apiFilters.search = filters.search;
      if (filters.assignee) apiFilters.assignee = filters.assignee;
      if (filters.archived !== undefined) apiFilters.archived = filters.archived;
      if (filters.fromDate) apiFilters.fromDate = filters.fromDate;
      if (filters.toDate) apiFilters.toDate = filters.toDate;

      // Handle filterType - only pass through valid values
      if (filters.filterType && ['total', 'open', 'closed'].includes(filters.filterType)) {
        apiFilters.filterType = filters.filterType;
      }

      // Pagination
      if (filters.pagination) {
        if (filters.pagination.page) apiFilters.page = filters.pagination.page;
        if (filters.pagination.limit) apiFilters.limit = filters.pagination.limit;
        if (filters.pagination.sortBy) apiFilters.sortBy = filters.pagination.sortBy;
        if (filters.pagination.sortOrder) apiFilters.sortOrder = filters.pagination.sortOrder;
      }

      const data = await devlogApiClient.list(apiFilters);

      // Handle the response (DevlogApiClient returns DevlogEntry[] directly)
      setDevlogs(data);
      setPagination(null); // DevlogApiClient doesn't return pagination info yet
      setError(null);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [filters, currentProject, devlogApiClient]);

  const fetchStats = useCallback(async () => {
    // Don't fetch if no current project or devlog client is available
    if (!currentProject || !devlogApiClient) {
      setStatsLoading(false);
      return;
    }

    try {
      setStatsLoading(true);
      setStatsError(null);

      const statsData = await devlogApiClient.getStatsOverview();
      setStats(statsData);
    } catch (err) {
      const errorMessage = handleApiError(err);
      console.error('Failed to fetch stats:', err);
      setStatsError(errorMessage);
    } finally {
      setStatsLoading(false);
    }
  }, [currentProject, devlogApiClient]);

  const fetchTimeSeriesStats = useCallback(async () => {
    // Don't fetch if no current project or devlog client is available
    if (!currentProject || !devlogApiClient) {
      setTimeSeriesLoading(false);
      return;
    }

    try {
      setTimeSeriesLoading(true);
      setTimeSeriesError(null);

      const timeSeriesData = await devlogApiClient.getStatsTimeseries('month');
      setTimeSeriesStats(timeSeriesData);
    } catch (err) {
      const errorMessage = handleApiError(err);
      console.error('Failed to fetch time series stats:', err);
      setTimeSeriesError(errorMessage);
    } finally {
      setTimeSeriesLoading(false);
    }
  }, [currentProject, devlogApiClient]);

  // All filtering is now handled server-side - simply return the devlogs from API
  const filteredDevlogs = useMemo(() => {
    return devlogs;
  }, [devlogs]);

  // CRUD operations
  const createDevlog = async (data: Partial<DevlogEntry>) => {
    if (!currentProject || !devlogApiClient) {
      throw new Error('No project selected or API client unavailable');
    }

    return devlogApiClient.create(data as any);
  };

  const updateDevlog = async (data: Partial<DevlogEntry> & { id: DevlogId }) => {
    if (!currentProject || !devlogApiClient) {
      throw new Error('No project selected or API client unavailable');
    }

    const { id, ...updateData } = data;
    return devlogApiClient.update(id, updateData as any);
  };

  const deleteDevlog = async (id: DevlogId) => {
    if (!currentProject || !devlogApiClient) {
      throw new Error('No project selected or API client unavailable');
    }

    // Optimistically remove from state immediately to prevent race conditions
    // This ensures the UI updates immediately, even if SSE events are delayed
    setDevlogs((current) => current.filter((devlog) => devlog.id !== id));

    try {
      await devlogApiClient.delete(id);
    } catch (error) {
      // If there's an error, refresh the list to restore correct state
      await fetchDevlogs();
      throw error;
    }
  };

  // Batch operations
  const batchUpdate = async (ids: DevlogId[], updates: any) => {
    if (!currentProject || !devlogApiClient) {
      throw new Error('No project selected or API client unavailable');
    }

    const result = await devlogApiClient.batchUpdate(ids, updates);
    await fetchDevlogs();
    return result;
  };

  const batchDelete = async (ids: DevlogId[]) => {
    if (!currentProject || !devlogApiClient) {
      throw new Error('No project selected or API client unavailable');
    }

    await devlogApiClient.batchDelete(ids);
    await fetchDevlogs();
  };

  const batchAddNote = async (ids: DevlogId[], content: string, category?: string) => {
    if (!currentProject || !devlogApiClient) {
      throw new Error('No project selected or API client unavailable');
    }

    try {
      await devlogApiClient.batchAddNote(ids, { content, category });

      // Don't need to refresh devlogs since notes are loaded separately now
      // Individual DevlogDetails components will refresh their notes via real-time updates
    } catch (error) {
      console.error('Failed to batch add notes:', error);
      throw error;
    }
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

  // Fetch stats when project changes
  useEffect(() => {
    if (currentProject) {
      fetchStats();
      hasStatsFetched.current = true;
    }
  }, [fetchStats, currentProject]);

  // Fetch time series stats when project changes
  useEffect(() => {
    if (currentProject) {
      fetchTimeSeriesStats();
      hasTimeSeriesFetched.current = true;
    }
  }, [fetchTimeSeriesStats, currentProject]);

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

  const value: DevlogContextType = {
    devlogs,
    pagination,
    loading,
    error,
    filters,
    filteredDevlogs,
    connected,
    stats,
    statsLoading,
    statsError,
    timeSeriesStats,
    timeSeriesLoading,
    timeSeriesError,
    setFilters,
    fetchDevlogs,
    fetchStats,
    fetchTimeSeriesStats,
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

  return <DevlogContext.Provider value={value}>{children}</DevlogContext.Provider>;
}

export function useDevlogContext() {
  const context = useContext(DevlogContext);
  if (context === undefined) {
    throw new Error('useDevlogContext must be used within a DevlogProvider');
  }
  return context;
}
