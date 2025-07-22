import { useDevlogContext } from '../contexts/DevlogContext';

interface UseTimeSeriesStatsResult {
  timeSeriesData: any;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching and managing time series stats
 * Uses shared context to prevent duplicate API calls
 */
export function useTimeSeriesStats(): UseTimeSeriesStatsResult {
  const { timeSeriesStats, timeSeriesLoading, timeSeriesError, fetchTimeSeriesStats } = useDevlogContext();

  return {
    timeSeriesData: timeSeriesStats,
    loading: timeSeriesLoading,
    error: timeSeriesError,
    refetch: fetchTimeSeriesStats,
  };
}
