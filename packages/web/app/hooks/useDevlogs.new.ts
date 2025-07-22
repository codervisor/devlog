import { useDevlogContext } from '../contexts/DevlogContext';

/**
 * Hook for managing devlogs data
 * Uses shared context to prevent duplicate API calls
 */
export function useDevlogs() {
  const {
    devlogs,
    pagination,
    loading,
    error,
    filters,
    filteredDevlogs,
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
  } = useDevlogContext();

  return {
    devlogs: filteredDevlogs,
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
