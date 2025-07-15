'use client';

import React, { useEffect, useState } from 'react';
import { Dashboard, PageLayout, OverviewStats } from '@/components';
import { useDevlogs } from '@/hooks/useDevlogs';
import { useDevlogFilters } from '@/hooks/useDevlogFilters';
import { DevlogStats, DevlogEntry, TimeSeriesStats } from '@devlog/core';
import { useRouter } from 'next/navigation';

export function DashboardPage() {
  const { devlogs, loading: isLoadingDevlogs } = useDevlogs();
  const { filters, filteredDevlogs, handleStatusFilter } = useDevlogFilters(devlogs);
  const [stats, setStats] = useState<DevlogStats | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesStats | null>(null);
  const [isLoadingTimeSeries, setIsLoadingTimeSeries] = useState(true);
  const router = useRouter();

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/devlogs/stats/overview');
        if (response.ok) {
          const statsData = await response.json();
          setStats(statsData);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
  }, [devlogs]);

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

  const actions = stats ? (
    <OverviewStats 
      stats={stats} 
      variant="detailed" 
      currentFilters={filters}
      onFilterToggle={handleStatusFilter}
      collapsible={true}
      defaultCollapsed={false}
    />
  ) : null;

  return (
    <PageLayout actions={actions}>
      <Dashboard
        stats={stats}
        timeSeriesData={timeSeriesData}
        isLoadingTimeSeries={isLoadingTimeSeries}
        recentDevlogs={filteredDevlogs.slice(0, 10)}
        isLoadingDevlogs={isLoadingDevlogs}
        onViewDevlog={handleViewDevlog}
      />
    </PageLayout>
  );
}
