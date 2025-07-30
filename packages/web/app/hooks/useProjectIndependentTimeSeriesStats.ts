import { useState, useCallback, useEffect } from 'react';
import { TimeSeriesStats } from '@codervisor/devlog-core';

interface UseProjectIndependentTimeSeriesStatsResult {
  timeSeriesData: TimeSeriesStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching and managing time series stats independently of project context
 * This hook directly uses the projectId without waiting for the project context to load
 */
export function useProjectIndependentTimeSeriesStats(
  projectId: number,
): UseProjectIndependentTimeSeriesStatsResult {
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeSeriesStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/projects/${projectId}/devlogs/stats/timeseries?days=30`);
      if (response.ok) {
        const timeSeriesStatsData = await response.json();
        setTimeSeriesData(timeSeriesStatsData);
      } else {
        throw new Error(
          `Failed to fetch time series stats: ${response.status} ${response.statusText}`,
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch time series stats';
      console.error('Failed to fetch time series stats:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Fetch time series stats on mount
  useEffect(() => {
    fetchTimeSeriesStats();
  }, [fetchTimeSeriesStats]);

  return {
    timeSeriesData,
    loading,
    error,
    refetch: fetchTimeSeriesStats,
  };
}
