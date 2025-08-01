'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  DevlogEntry,
  DevlogId,
  DevlogFilter,
  PaginationMeta,
  DevlogStatus,
  FilterType,
  DevlogStats,
  TimeSeriesStats,
} from '@codervisor/devlog-core';
import { DevlogApiClient, handleApiError } from '@/lib';
import { useProjectStore } from './project-store';

// Helper function to get DevlogApiClient
const getDevlogApiClient = () => {
  const currentProject = useProjectStore.getState().currentProject;
  return currentProject ? new DevlogApiClient(currentProject.projectId.toString()) : null;
};

interface DevlogState {
  // Devlogs state
  devlogs: DevlogEntry[];
  pagination: PaginationMeta | null;
  loading: boolean;
  error: string | null;
  filters: DevlogFilter;
  connected: boolean;

  // Selected devlog state (for detail views)
  selectedDevlog: DevlogEntry | null;
  selectedDevlogLoading: boolean;
  selectedDevlogError: string | null;

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
  fetchSelectedDevlog: (id: DevlogId) => Promise<void>;
  clearSelectedDevlog: () => void;
  createDevlog: (data: Partial<DevlogEntry>) => Promise<any>;
  updateDevlog: (data: Partial<DevlogEntry> & { id: DevlogId }) => Promise<any>;
  updateSelectedDevlog: (data: Partial<DevlogEntry> & { id: DevlogId }) => Promise<DevlogEntry>;
  deleteDevlog: (id: DevlogId) => Promise<void>;
  batchUpdate: (ids: DevlogId[], updates: any) => Promise<any>;
  batchDelete: (ids: DevlogId[]) => Promise<void>;
  batchAddNote: (ids: DevlogId[], content: string, category?: string) => Promise<any>;
  goToPage: (page: number) => void;
  changePageSize: (pageSize: number) => void;
  handleStatusFilter: (filterValue: FilterType | DevlogStatus) => void;
  setConnected: (connected: boolean) => void;
  handleDevlogCreated: (devlog: DevlogEntry) => void;
  handleDevlogUpdated: (devlog: DevlogEntry) => void;
  handleDevlogDeleted: (data: { id: DevlogId }) => void;
  clearErrors: () => void;
}

export const useDevlogStore = create<DevlogState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    devlogs: [],
    pagination: null,
    loading: true,
    error: null,
    filters: {
      pagination: {
        page: 1,
        limit: 20,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      },
    },
    connected: false,

    // Selected devlog state
    selectedDevlog: null,
    selectedDevlogLoading: false,
    selectedDevlogError: null,

    // Stats state
    stats: null,
    statsLoading: true,
    statsError: null,

    // Time series stats state
    timeSeriesStats: null,
    timeSeriesLoading: true,
    timeSeriesError: null,

    // Actions
    setFilters: (filtersOrUpdater) => {
      const currentFilters = get().filters;
      const newFilters =
        typeof filtersOrUpdater === 'function'
          ? filtersOrUpdater(currentFilters)
          : filtersOrUpdater;
      set({ filters: newFilters });
    },

    fetchDevlogs: async () => {
      const currentProject = useProjectStore.getState().currentProject;
      const devlogApiClient = getDevlogApiClient();

      if (!currentProject || !devlogApiClient) {
        set({ loading: false });
        return;
      }

      try {
        set({ loading: true, error: null });

        const { filters } = get();

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
        set({ devlogs: data, pagination: null, error: null });
      } catch (err) {
        set({ error: handleApiError(err) });
      } finally {
        set({ loading: false });
      }
    },

    fetchStats: async () => {
      const currentProject = useProjectStore.getState().currentProject;
      const devlogApiClient = getDevlogApiClient();

      if (!currentProject || !devlogApiClient) {
        set({ statsLoading: false });
        return;
      }

      try {
        set({ statsLoading: true, statsError: null });
        const statsData = await devlogApiClient.getStatsOverview();
        set({ stats: statsData });
      } catch (err) {
        const errorMessage = handleApiError(err);
        console.error('Failed to fetch stats:', err);
        set({ statsError: errorMessage });
      } finally {
        set({ statsLoading: false });
      }
    },

    fetchTimeSeriesStats: async () => {
      const currentProject = useProjectStore.getState().currentProject;
      const devlogApiClient = getDevlogApiClient();

      if (!currentProject || !devlogApiClient) {
        set({ timeSeriesLoading: false });
        return;
      }

      try {
        set({ timeSeriesLoading: true, timeSeriesError: null });
        const timeSeriesData = await devlogApiClient.getStatsTimeseries('month');
        set({ timeSeriesStats: timeSeriesData });
      } catch (err) {
        const errorMessage = handleApiError(err);
        console.error('Failed to fetch time series stats:', err);
        set({ timeSeriesError: errorMessage });
      } finally {
        set({ timeSeriesLoading: false });
      }
    },

    fetchSelectedDevlog: async (id: DevlogId) => {
      const currentProject = useProjectStore.getState().currentProject;
      const devlogApiClient = getDevlogApiClient();

      if (!currentProject || !devlogApiClient) {
        set({
          selectedDevlogError: 'No project selected or API client unavailable',
          selectedDevlogLoading: false,
        });
        return;
      }

      try {
        set({ selectedDevlogLoading: true, selectedDevlogError: null });
        const devlog = await devlogApiClient.get(id);
        set({ selectedDevlog: devlog });
      } catch (err) {
        const errorMessage = handleApiError(err);
        console.error('Failed to fetch selected devlog:', err);
        set({ selectedDevlogError: errorMessage });
      } finally {
        set({ selectedDevlogLoading: false });
      }
    },

    clearSelectedDevlog: () => {
      set({
        selectedDevlog: null,
        selectedDevlogError: null,
        selectedDevlogLoading: false,
      });
    },

    createDevlog: async (data: Partial<DevlogEntry>) => {
      const currentProject = useProjectStore.getState().currentProject;
      const devlogApiClient = getDevlogApiClient();

      if (!currentProject || !devlogApiClient) {
        throw new Error('No project selected or API client unavailable');
      }

      return devlogApiClient.create(data as any);
    },

    updateDevlog: async (data: Partial<DevlogEntry> & { id: DevlogId }) => {
      const currentProject = useProjectStore.getState().currentProject;
      const devlogApiClient = getDevlogApiClient();

      if (!currentProject || !devlogApiClient) {
        throw new Error('No project selected or API client unavailable');
      }

      const { id, ...updateData } = data;
      return devlogApiClient.update(id, updateData as any);
    },

    updateSelectedDevlog: async (data: Partial<DevlogEntry> & { id: DevlogId }) => {
      const currentProject = useProjectStore.getState().currentProject;
      const devlogApiClient = getDevlogApiClient();

      if (!currentProject || !devlogApiClient) {
        throw new Error('No project selected or API client unavailable');
      }

      const { id, ...updateData } = data;
      const updatedDevlog = await devlogApiClient.update(id, updateData as any);

      // Update both selected devlog and list if the devlog exists in the list
      set({ selectedDevlog: updatedDevlog });

      const { devlogs } = get();
      const index = devlogs.findIndex((devlog) => devlog.id === updatedDevlog.id);
      if (index >= 0) {
        const updated = [...devlogs];
        updated[index] = updatedDevlog;
        set({ devlogs: updated });
      }

      return updatedDevlog;
    },

    deleteDevlog: async (id: DevlogId) => {
      const currentProject = useProjectStore.getState().currentProject;
      const devlogApiClient = getDevlogApiClient();

      if (!currentProject || !devlogApiClient) {
        throw new Error('No project selected or API client unavailable');
      }

      try {
        await devlogApiClient.delete(id);
      } catch (error) {
        throw error;
      } finally {
        await get().fetchDevlogs();
      }
    },

    batchUpdate: async (ids: DevlogId[], updates: any) => {
      const currentProject = useProjectStore.getState().currentProject;
      const devlogApiClient = getDevlogApiClient();

      if (!currentProject || !devlogApiClient) {
        throw new Error('No project selected or API client unavailable');
      }

      const result = await devlogApiClient.batchUpdate(ids, updates);
      await get().fetchDevlogs();
      return result;
    },

    batchDelete: async (ids: DevlogId[]) => {
      const currentProject = useProjectStore.getState().currentProject;
      const devlogApiClient = getDevlogApiClient();

      if (!currentProject || !devlogApiClient) {
        throw new Error('No project selected or API client unavailable');
      }

      await devlogApiClient.batchDelete(ids);
      await get().fetchDevlogs();
    },

    batchAddNote: async (ids: DevlogId[], content: string, category?: string) => {
      const currentProject = useProjectStore.getState().currentProject;
      const devlogApiClient = getDevlogApiClient();

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
    },

    goToPage: (page: number) => {
      const { filters } = get();
      get().setFilters({
        ...filters,
        pagination: {
          ...filters.pagination!,
          page,
        },
      });
    },

    changePageSize: (limit: number) => {
      const { filters } = get();
      get().setFilters({
        ...filters,
        pagination: {
          ...filters.pagination!,
          limit,
          page: 1, // Reset to first page when changing page size
        },
      });
    },

    handleStatusFilter: (filterValue: FilterType | DevlogStatus) => {
      const { filters } = get();
      if (['total', 'open', 'closed'].includes(filterValue)) {
        get().setFilters({
          ...filters,
          filterType: filterValue,
          status: undefined,
        });
      } else {
        get().setFilters({
          ...filters,
          filterType: undefined,
          status: [filterValue as DevlogStatus],
        });
      }
    },

    setConnected: (connected: boolean) => set({ connected }),

    // Real-time event handlers
    handleDevlogCreated: (newDevlog: DevlogEntry) => {
      get().fetchDevlogs();
    },

    handleDevlogUpdated: (updatedDevlog: DevlogEntry) => {
      const { devlogs, selectedDevlog } = get();

      // Update in devlogs list
      const index = devlogs.findIndex((devlog) => devlog.id === updatedDevlog.id);
      if (index >= 0) {
        const updated = [...devlogs];
        updated[index] = updatedDevlog;
        set({ devlogs: updated });
      } else {
        get().fetchDevlogs();
      }

      // Also update selected devlog if it matches
      if (selectedDevlog && selectedDevlog.id === updatedDevlog.id) {
        set({ selectedDevlog: updatedDevlog });
      }
    },

    handleDevlogDeleted: (deletedData: { id: DevlogId }) => {
      const { devlogs, selectedDevlog } = get();

      // Remove from devlogs list
      const filteredDevlogs = devlogs.filter((devlog) => devlog.id !== deletedData.id);
      set({ devlogs: filteredDevlogs });

      // Clear selected devlog if it was deleted
      if (selectedDevlog && selectedDevlog.id === deletedData.id) {
        set({ selectedDevlog: null });
      }
    },

    clearErrors: () => {
      set({
        error: null,
        selectedDevlogError: null,
        statsError: null,
        timeSeriesError: null,
      });
    },
  })),
);

// Subscribe to project changes to automatically fetch devlogs
useProjectStore.subscribe(
  (state) => state.currentProject,
  (currentProject) => {
    if (currentProject) {
      // Fetch devlogs when project changes
      useDevlogStore.getState().fetchDevlogs();
      useDevlogStore.getState().fetchStats();
      useDevlogStore.getState().fetchTimeSeriesStats();
    }
  },
);

// Computed selectors
export const useFilteredDevlogs = () => {
  return useDevlogStore((state) => {
    // For now, return all devlogs since filtering is handled on the API side
    // In the future, we could add client-side filtering here if needed
    return state.devlogs;
  });
};
