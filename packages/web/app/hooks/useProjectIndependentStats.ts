import { useState, useCallback, useEffect } from 'react';
import { DevlogStats } from '@codervisor/devlog-core';

interface UseProjectIndependentStatsResult {
  stats: DevlogStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching and managing devlog stats independently of project context
 * This hook directly uses the projectId without waiting for the project context to load
 */
export function useProjectIndependentStats(projectId: number): UseProjectIndependentStatsResult {
  const [stats, setStats] = useState<DevlogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/projects/${projectId}/devlogs/stats/overview`);
      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      } else {
        throw new Error(`Failed to fetch stats: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stats';
      console.error('Failed to fetch stats:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}
