import { useState, useCallback, useEffect } from 'react';
import { DevlogStats, TimeSeriesStats } from '@codervisor/devlog-core';
import { useProject } from '@/contexts/ProjectContext';
import { useDevlogContext } from '@/contexts/DevlogContext';
import { apiClient, handleApiError } from '@/lib/api-client';

interface UseStatsOptions {
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

interface UseStatsResult {
  stats: DevlogStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Unified hook for fetching and managing devlog stats.
 * Can work with or without DevlogContext, and with explicit project IDs.
 */
export function useStats(options: UseStatsOptions = {}): UseStatsResult {
  const { projectId: explicitProjectId, useContext = true } = options;

  // Try to get context data
  const { currentProject } = useProject();
  const contextData = useContext && !explicitProjectId ? useDevlogContext() : null;

  // Determine the actual project ID to use
  const projectId = explicitProjectId || currentProject?.projectId;

  // If we should use context and have context data, return it
  if (contextData && !explicitProjectId) {
    return {
      stats: contextData.stats,
      loading: contextData.statsLoading,
      error: contextData.statsError,
      refetch: contextData.fetchStats,
    };
  }

  // Otherwise, implement standalone logic
  const [stats, setStats] = useState<DevlogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!projectId) {
      setError('No project ID available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const statsData = await apiClient.get<DevlogStats>(
        `/api/projects/${projectId}/devlogs/stats/overview`,
      );
      setStats(statsData);
    } catch (err) {
      const errorMessage = handleApiError(err);
      console.error('Failed to fetch stats:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Fetch stats on mount (only if not using context)
  useEffect(() => {
    if (!contextData) {
      fetchStats();
    }
  }, [fetchStats, contextData]);

  return {
    stats,
    loading,
    error,
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
 * Unified hook for fetching and managing time series stats.
 * Can work with or without DevlogContext, and with explicit project IDs.
 */
export function useTimeSeriesStats(options: UseStatsOptions = {}): UseTimeSeriesStatsResult {
  const { projectId: explicitProjectId, useContext = true } = options;

  // Try to get context data
  const { currentProject } = useProject();
  const contextData = useContext && !explicitProjectId ? useDevlogContext() : null;

  // Determine the actual project ID to use
  const projectId = explicitProjectId || currentProject?.projectId;

  // If we should use context and have context data, return it
  if (contextData && !explicitProjectId) {
    return {
      timeSeriesData: contextData.timeSeriesStats,
      loading: contextData.timeSeriesLoading,
      error: contextData.timeSeriesError,
      refetch: contextData.fetchTimeSeriesStats,
    };
  }

  // Otherwise, implement standalone logic
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeSeriesStats = useCallback(async () => {
    if (!projectId) {
      setError('No project ID available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const timeSeriesStatsData = await apiClient.get<TimeSeriesStats>(
        `/api/projects/${projectId}/devlogs/stats/timeseries?days=30`,
      );
      setTimeSeriesData(timeSeriesStatsData);
    } catch (err) {
      const errorMessage = handleApiError(err);
      console.error('Failed to fetch time series stats:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Fetch time series stats on mount (only if not using context)
  useEffect(() => {
    if (!contextData) {
      fetchTimeSeriesStats();
    }
  }, [fetchTimeSeriesStats, contextData]);

  return {
    timeSeriesData,
    loading,
    error,
    refetch: fetchTimeSeriesStats,
  };
}
