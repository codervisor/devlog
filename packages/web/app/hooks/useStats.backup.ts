import { useState, useEffect, useRef } from 'react';
import { DevlogStats } from '@devlog/core';

interface UseStatsResult {
  stats: DevlogStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching and managing devlog stats
 * Stats represent the overall system state and should not refresh on every filter change
 */
export function useStats(): UseStatsResult {
  const [stats, setStats] = useState<DevlogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/devlogs/stats/overview');
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
  };

  // Only fetch stats once on mount, not on every dependency change
  useEffect(() => {
    if (!hasFetched.current) {
      fetchStats();
      hasFetched.current = true;
    }
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}
