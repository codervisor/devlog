import { DevlogStats, TimeSeriesStats } from '@codervisor/devlog-core';
import { useDevlogContext } from '@/contexts/DevlogContext';

interface UseStatsResult {
  stats: DevlogStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for accessing devlog stats from DevlogContext.
 * Always uses the shared context for consistency.
 */
export function useStats(): UseStatsResult {
  const { stats, statsLoading, statsError, fetchStats } = useDevlogContext();

  return {
    stats,
    loading: statsLoading,
    error: statsError,
    refetch: fetchStats,
  };
}

interface UseTimeSeriesStatsResult {
  timeSeriesData: TimeSeriesStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for accessing time series stats from DevlogContext.
 * Always uses the shared context for consistency.
 */
export function useTimeSeriesStats(): UseTimeSeriesStatsResult {
  const { timeSeriesStats, timeSeriesLoading, timeSeriesError, fetchTimeSeriesStats } =
    useDevlogContext();

  return {
    timeSeriesData: timeSeriesStats,
    loading: timeSeriesLoading,
    error: timeSeriesError,
    refetch: fetchTimeSeriesStats,
  };
}
