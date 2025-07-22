import { useDevlogContext } from '../contexts/DevlogContext';

interface UseStatsResult {
  stats: any;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching and managing devlog stats
 * Uses shared context to prevent duplicate API calls
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
