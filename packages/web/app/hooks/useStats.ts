import { useState, useEffect } from 'react';
import { DevlogStats } from '@devlog/core';

interface UseStatsResult {
  stats: DevlogStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching and managing devlog stats
 */
export function useStats(dependencies: any[] = []): UseStatsResult {
  const [stats, setStats] = useState<DevlogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchStats();
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}
