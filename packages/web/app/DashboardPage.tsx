'use client';

import React, { useEffect, useState } from 'react';
import { Dashboard, PageLayout, OverviewStats } from '@/components';
import { useDevlogs } from '@/hooks/useDevlogs';
import { useStats } from '@/hooks/useStats';
import { DevlogEntry, TimeSeriesStats } from '@devlog/core';
import { useRouter } from 'next/navigation';

export function DashboardPage() {
  const { devlogs, filters, handleStatusFilter, loading: isLoadingDevlogs } = useDevlogs();
  const { stats, loading: isLoadingStats } = useStats();
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesStats | null>(null);
  const [isLoadingTimeSeries, setIsLoadingTimeSeries] = useState(true);
  const router = useRouter();

  // Fetch time series data
  useEffect(() => {
    const fetchTimeSeriesData = async () => {
      try {
        setIsLoadingTimeSeries(true);
        const response = await fetch('/api/devlogs/stats/timeseries?days=30');
        if (response.ok) {
          const data: TimeSeriesStats = await response.json();
          setTimeSeriesData(data);
        } else {
          console.error('Failed to fetch time series data');
        }
      } catch (error) {
        console.error('Error fetching time series data:', error);
      } finally {
        setIsLoadingTimeSeries(false);
      }
    };

    fetchTimeSeriesData();
  }, []);

  const handleViewDevlog = (devlog: DevlogEntry) => {
    router.push(`/devlogs/${devlog.id}`);
  };

  const actions = (
    <OverviewStats 
      stats={stats} 
      loading={isLoadingStats}
      variant="detailed" 
      currentFilters={filters}
      onFilterToggle={handleStatusFilter}
    />
  );

  return (
    <PageLayout actions={actions}>
      <Dashboard
        stats={stats}
        timeSeriesData={timeSeriesData}
        isLoadingTimeSeries={isLoadingTimeSeries}
        recentDevlogs={devlogs.slice(0, 10)}
        isLoadingDevlogs={isLoadingDevlogs}
        onViewDevlog={handleViewDevlog}
      />
    </PageLayout>
  );
}
