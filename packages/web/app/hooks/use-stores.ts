// Updated hooks that use Zustand stores instead of React Context
export { useProjectStore as useProject } from '@/stores';
export { useDevlogStore as useDevlogContext } from '@/stores';
export { useFilteredDevlogs } from '@/stores';

// Compatibility hook for useDevlogs - maps to the store
import { useDevlogStore } from '@/stores';

export function useDevlogs() {
  const store = useDevlogStore();

  return {
    devlogs: store.devlogs,
    pagination: store.pagination,
    loading: store.loading,
    error: store.error,
    filters: store.filters,
    connected: store.connected,
    setFilters: store.setFilters,
    fetchDevlogs: store.fetchDevlogs,
    createDevlog: store.createDevlog,
    updateDevlog: store.updateDevlog,
    deleteDevlog: store.deleteDevlog,
    batchUpdate: store.batchUpdate,
    batchDelete: store.batchDelete,
    batchAddNote: store.batchAddNote,
    goToPage: store.goToPage,
    changePageSize: store.changePageSize,
    handleStatusFilter: store.handleStatusFilter,
  };
}

// Compatibility hook for useStats
export function useStats() {
  const store = useDevlogStore();

  return {
    stats: store.stats,
    loading: store.statsLoading,
    error: store.statsError,
    refetch: store.fetchStats,
  };
}
