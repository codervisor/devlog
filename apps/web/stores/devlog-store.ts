'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  DevlogEntry,
  DevlogFilter,
  DevlogId,
  DevlogNote,
  DevlogStats,
  DevlogStatus,
  FilterType,
  PaginationMeta,
  SortOptions,
  TimeSeriesStats,
} from '@codervisor/devlog-core';
import { debounce, DevlogApiClient, handleApiError } from '@/lib';
import { useProjectStore } from './project-store';
import {
  DataContext,
  getDefaultDataContext,
  getDefaultTableDataContext,
  TableDataContext,
} from '@/stores/base';

// Helper function to get DevlogApiClient
const getDevlogApiClient = () => {
  const { currentProjectName } = useProjectStore.getState();
  return currentProjectName ? new DevlogApiClient(currentProjectName) : null;
};

interface DevlogState {
  // Devlogs state
  devlogsContext: TableDataContext<DevlogEntry[], DevlogFilter>;

  // Navigation devlog state (for dropdowns/navigation - separate from main list)
  navigationDevlogsContext: DataContext<DevlogEntry[]>;

  // Current devlog state (for detail views)
  currentDevlogId: DevlogId | null;
  currentDevlogContext: DataContext<DevlogEntry>;
  currentDevlogNotesContext: DataContext<DevlogNote[]>;

  // Stats state
  statsContext: DataContext<DevlogStats>;

  // Time series stats state
  timeSeriesStatsContext: DataContext<TimeSeriesStats>;

  // Actions
  setCurrentDevlogId: (id: DevlogId) => void;
  setDevlogsFilters: (filters: DevlogFilter) => void;
  setDevlogsPagination: (pagination: PaginationMeta) => void;
  setDevlogsSortOptions: (sortOptions: SortOptions) => void;
  fetchDevlogs: () => Promise<void>;
  fetchNavigationDevlogs: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchTimeSeriesStats: () => Promise<void>;
  fetchCurrentDevlog: () => Promise<void>;
  clearCurrentDevlog: () => void;
  fetchCurrentDevlogNotes: () => Promise<void>;
  clearCurrentDevlogNotes: () => void;
  createDevlog: (data: Partial<DevlogEntry>) => Promise<any>;
  updateDevlog: (data: Partial<DevlogEntry> & { id: DevlogId }) => Promise<any>;
  updateSelectedDevlog: (data: Partial<DevlogEntry> & { id: DevlogId }) => Promise<DevlogEntry>;
  deleteDevlog: (id: DevlogId) => Promise<void>;
  batchUpdate: (ids: DevlogId[], updates: any) => Promise<any>;
  batchDelete: (ids: DevlogId[]) => Promise<void>;
  handleStatusFilter: (filterValue: FilterType | DevlogStatus) => void;
  clearErrors: () => void;
}

export const useDevlogStore = create<DevlogState>()(
  subscribeWithSelector((set, get) => {
    const debouncedFetchDevlogs = debounce(async () => {
      const devlogApiClient = getDevlogApiClient();

      if (!devlogApiClient) {
        set((state) => ({
          devlogsContext: {
            ...state.devlogsContext,
            loading: false,
          },
        }));
        return;
      }

      try {
        set((state) => ({
          devlogsContext: {
            ...state.devlogsContext,
            loading: true,
            error: null,
          },
        }));

        const { devlogsContext } = get();
        const { filters, pagination, sortOptions } = devlogsContext;

        // Convert filters to DevlogFilter format for the API client
        const filter: DevlogFilter = {};
        if (filters.status && filters.status.length > 0) {
          filter.status = filters.status;
        }
        if (filters.type && filters.type.length > 0) {
          filter.type = filters.type;
        }
        if (filters.priority && filters.priority.length > 0) {
          filter.priority = filters.priority;
        }

        // Direct mappings
        if (filters.search) filter.search = filters.search;
        if (filters.assignee) filter.assignee = filters.assignee;
        if (filters.archived !== undefined) filter.archived = filters.archived;
        if (filters.fromDate) filter.fromDate = filters.fromDate;
        if (filters.toDate) filter.toDate = filters.toDate;

        const { items: data, pagination: responsePagination } = await devlogApiClient.list(
          filter,
          pagination,
          sortOptions,
        );
        set((state) => ({
          devlogsContext: {
            ...state.devlogsContext,
            data,
            pagination: {
              ...state.devlogsContext.pagination,
              total: responsePagination.total,
              totalPages: responsePagination.totalPages,
            },
            error: null,
          },
        }));
      } catch (err) {
        set((state) => ({
          devlogsContext: {
            ...state.devlogsContext,
            error: handleApiError(err),
          },
        }));
      } finally {
        set((state) => ({
          devlogsContext: {
            ...state.devlogsContext,
            loading: false,
          },
        }));
      }
    });

    return {
      // Initial state
      devlogsContext: getDefaultTableDataContext(),

      // Navigation devlog state
      navigationDevlogsContext: getDefaultDataContext(),

      // Selected devlog state
      currentDevlogId: null,
      currentDevlogContext: getDefaultDataContext(),
      currentDevlogNotesContext: getDefaultDataContext(),

      // Stats state
      statsContext: getDefaultDataContext(),

      // Time series stats state
      timeSeriesStatsContext: getDefaultDataContext(),

      // Actions
      setCurrentDevlogId: (id: DevlogId) => {
        set({
          currentDevlogId: id,
          currentDevlogContext: getDefaultDataContext(),
        });
      },

      setDevlogsFilters: (filters) => {
        const currentFilters = get().devlogsContext.filters;
        set((state) => ({
          devlogsContext: {
            ...state.devlogsContext,
            filters: {
              ...currentFilters,
              ...filters,
            },
          },
        }));
      },

      setDevlogsPagination: (pagination: PaginationMeta) => {
        set((state) => ({
          devlogsContext: {
            ...state.devlogsContext,
            pagination: {
              ...state.devlogsContext.pagination,
              ...pagination,
            },
          },
        }));
      },

      setDevlogsSortOptions: (sortOptions: SortOptions) => {
        set((state) => ({
          devlogsContext: {
            ...state.devlogsContext,
            sortOptions,
          },
        }));
      },

      fetchDevlogs: async () => {
        debouncedFetchDevlogs();
      },

      fetchNavigationDevlogs: async () => {
        const devlogApiClient = getDevlogApiClient();

        if (!devlogApiClient) {
          set((state) => ({
            navigationDevlogsContext: {
              ...state.navigationDevlogsContext,
              loading: false,
            },
          }));
          return;
        }

        try {
          set((state) => ({
            navigationDevlogsContext: {
              ...state.navigationDevlogsContext,
              loading: true,
              error: null,
            },
          }));

          // Fetch recent devlog for navigation - limit to 50 most recent
          const { items: data } = await devlogApiClient.list(
            {}, // No filters
            { page: 1, limit: 50 }, // Simple pagination
            { sortBy: 'id', sortOrder: 'desc' }, // Sort by ID descending
          );

          set((state) => ({
            navigationDevlogsContext: {
              ...state.navigationDevlogsContext,
              data,
              error: null,
            },
          }));
        } catch (err) {
          set((state) => ({
            navigationDevlogsContext: {
              ...state.navigationDevlogsContext,
              error: handleApiError(err),
            },
          }));
        } finally {
          set((state) => ({
            navigationDevlogsContext: {
              ...state.navigationDevlogsContext,
              loading: false,
            },
          }));
        }
      },

      fetchStats: async () => {
        const devlogApiClient = getDevlogApiClient();

        if (!devlogApiClient) {
          set((state) => ({
            statsContext: {
              ...state.statsContext,
              loading: false,
            },
          }));
          return;
        }

        try {
          set((state) => ({
            statsContext: {
              ...state.statsContext,
              loading: true,
              error: null,
            },
          }));
          const statsData = await devlogApiClient.getStatsOverview();
          set((state) => ({
            statsContext: {
              ...state.statsContext,
              data: statsData,
              error: null,
            },
          }));
        } catch (err) {
          const errorMessage = handleApiError(err);
          console.error('Failed to fetch stats:', err);
          set((state) => ({
            statsContext: {
              ...state.statsContext,
              error: errorMessage,
            },
          }));
        } finally {
          set((state) => ({
            statsContext: {
              ...state.statsContext,
              loading: false,
            },
          }));
        }
      },

      fetchTimeSeriesStats: async () => {
        const devlogApiClient = getDevlogApiClient();

        if (!devlogApiClient) {
          set((state) => ({
            timeSeriesStatsContext: {
              ...state.timeSeriesStatsContext,
              loading: false,
            },
          }));
          return;
        }

        try {
          set((state) => ({
            timeSeriesStatsContext: {
              ...state.timeSeriesStatsContext,
              loading: true,
              error: null,
            },
          }));
          const timeSeriesData = await devlogApiClient.getStatsTimeseries('month');
          set((state) => ({
            timeSeriesStatsContext: {
              ...state.timeSeriesStatsContext,
              data: timeSeriesData,
              error: null,
            },
          }));
        } catch (err) {
          const errorMessage = handleApiError(err);
          console.error('Failed to fetch time series stats:', err);
          set((state) => ({
            timeSeriesStatsContext: {
              ...state.timeSeriesStatsContext,
              error: errorMessage,
            },
          }));
        } finally {
          set((state) => ({
            timeSeriesStatsContext: {
              ...state.timeSeriesStatsContext,
              loading: false,
            },
          }));
        }
      },

      fetchCurrentDevlog: async () => {
        const { currentDevlogId } = get();
        const devlogApiClient = getDevlogApiClient();
        if (!currentDevlogId || !devlogApiClient) {
          set((state) => ({
            currentDevlogContext: {
              ...state.currentDevlogContext,
              loading: false,
              error: 'No devlog selected or API client unavailable',
            },
          }));
          return;
        }

        try {
          set((state) => ({
            currentDevlogContext: {
              ...state.currentDevlogContext,
              loading: true,
              error: null,
            },
          }));
          const currentDevlog = await devlogApiClient.get(currentDevlogId);
          set((state) => ({
            currentDevlogContext: {
              ...state.currentDevlogContext,
              data: currentDevlog,
              error: null,
            },
          }));
        } catch (err) {
          const errorMessage = handleApiError(err);
          console.error('Failed to fetch selected devlog:', err);
          set((state) => ({
            currentDevlogContext: {
              ...state.currentDevlogContext,
              error: errorMessage,
            },
          }));
        } finally {
          set((state) => ({
            currentDevlogContext: {
              ...state.currentDevlogContext,
              loading: false,
            },
          }));
        }
      },

      clearCurrentDevlog: () => {
        set({
          currentDevlogContext: getDefaultDataContext(),
        });
      },

      fetchCurrentDevlogNotes: async () => {
        const { currentDevlogId } = get();
        const devlogApiClient = getDevlogApiClient();

        if (!currentDevlogId || !devlogApiClient) {
          set((state) => ({
            currentDevlogNotesContext: {
              ...state.currentDevlogNotesContext,
              loading: false,
              error: 'No devlog selected or API client unavailable',
            },
          }));
          return;
        }

        try {
          // set({ currentDevlogNotesLoading: true, currentDevlogNotesError: null });
          set((state) => ({
            currentDevlogNotesContext: {
              ...state.currentDevlogNotesContext,
              loading: true,
              error: null,
            },
          }));
          const notes = await devlogApiClient.getNotes(currentDevlogId);
          set((state) => ({
            currentDevlogNotesContext: {
              ...state.currentDevlogNotesContext,
              data: notes,
              error: null,
            },
          }));
        } catch (err) {
          const errorMessage = handleApiError(err);
          console.error('Failed to fetch devlog notes:', err);
          set((state) => ({
            currentDevlogNotesContext: {
              ...state.currentDevlogNotesContext,
              error: errorMessage,
            },
          }));
          // set({ currentDevlogNotesError: errorMessage });
        } finally {
          set((state) => ({
            currentDevlogNotesContext: {
              ...state.currentDevlogNotesContext,
              loading: false,
            },
          }));
        }
      },

      clearCurrentDevlogNotes: () => {
        set({ currentDevlogNotesContext: getDefaultDataContext() });
      },

      createDevlog: async (data: Partial<DevlogEntry>) => {
        const currentProject = useProjectStore.getState().currentProjectContext.data;
        const devlogApiClient = getDevlogApiClient();

        if (!currentProject || !devlogApiClient) {
          throw new Error('No project selected or API client unavailable');
        }

        return devlogApiClient.create(data as any);
      },

      updateDevlog: async (data: Partial<DevlogEntry> & { id: DevlogId }) => {
        const currentProject = useProjectStore.getState().currentProjectContext.data;
        const devlogApiClient = getDevlogApiClient();

        if (!currentProject || !devlogApiClient) {
          throw new Error('No project selected or API client unavailable');
        }

        const { id, ...updateData } = data;
        return devlogApiClient.update(id, updateData as any);
      },

      updateSelectedDevlog: async (data: Partial<DevlogEntry> & { id: DevlogId }) => {
        const currentProject = useProjectStore.getState().currentProjectContext.data;
        const devlogApiClient = getDevlogApiClient();

        if (!currentProject || !devlogApiClient) {
          throw new Error('No project selected or API client unavailable');
        }

        const { id, ...updateData } = data;
        const updatedDevlog = await devlogApiClient.update(id, updateData as any);

        // Update both selected devlog and list if the devlog exists in the list
        set((state) => ({
          currentDevlogContext: {
            ...state.currentDevlogContext,
            data: updatedDevlog,
            error: null,
          },
        }));

        const { devlogsContext } = get();
        const devlogs = devlogsContext.data;
        if (devlogs) {
          const index = devlogs.findIndex((devlog) => devlog.id === updatedDevlog.id);
          if (index >= 0) {
            const updated = [...devlogs];
            updated[index] = updatedDevlog;
            set((state) => ({
              devlogsContext: {
                ...state.devlogsContext,
                data: updated,
              },
            }));
          }
        }

        return updatedDevlog;
      },

      deleteDevlog: async (id: DevlogId) => {
        const currentProject = useProjectStore.getState().currentProjectContext.data;
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
        const currentProject = useProjectStore.getState().currentProjectContext.data;
        const devlogApiClient = getDevlogApiClient();

        if (!currentProject || !devlogApiClient) {
          throw new Error('No project selected or API client unavailable');
        }

        const result = await devlogApiClient.batchUpdate(ids, updates);
        await get().fetchDevlogs();
        return result;
      },

      batchDelete: async (ids: DevlogId[]) => {
        const currentProject = useProjectStore.getState().currentProjectContext.data;
        const devlogApiClient = getDevlogApiClient();

        if (!currentProject || !devlogApiClient) {
          throw new Error('No project selected or API client unavailable');
        }

        await devlogApiClient.batchDelete(ids);
        await get().fetchDevlogs();
      },

      handleStatusFilter: (filterValue: FilterType | DevlogStatus) => {
        const { devlogsContext } = get();
        const { filters } = devlogsContext;
        if (['total', 'open', 'closed'].includes(filterValue)) {
          get().setDevlogsFilters({
            ...filters,
            status: undefined,
          });
        } else {
          get().setDevlogsFilters({
            ...filters,
            status: [filterValue as DevlogStatus],
          });
        }
      },

      clearErrors: () => {
        set((state) => ({
          devlogsContext: {
            ...state.devlogsContext,
            error: null,
          },
          navigationDevlogsContext: {
            ...state.navigationDevlogsContext,
            error: null,
          },
          statsContext: {
            ...state.statsContext,
            error: null,
          },
          timeSeriesStatsContext: {
            ...state.timeSeriesStatsContext,
            error: null,
          },
          currentDevlogContext: {
            ...state.currentDevlogContext,
            error: null,
          },
          currentDevlogNotesContext: {
            ...state.currentDevlogNotesContext,
            error: null,
          },
        }));
      },
    };
  }),
);
