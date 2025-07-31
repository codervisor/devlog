'use client';

import React from 'react';
import { Dashboard, PageLayout } from '@/components';
import { useDevlogData } from '@/hooks/useDevlogData';
import { useStats, useTimeSeriesStats } from '@/hooks/useStatsData';
import { DevlogEntry } from '@codervisor/devlog-core';
import { useRouter } from 'next/navigation';

export function DashboardPage() {
  const { filteredDevlogs, loading: isLoadingDevlogs } = useDevlogData({ useContext: true });
  const { stats, loading: isLoadingStats } = useStats({ useContext: true });
  const { timeSeriesData, loading: isLoadingTimeSeries } = useTimeSeriesStats({ useContext: true });
  const router = useRouter();

  const handleViewDevlog = (devlog: DevlogEntry) => {
    router.push(`/devlogs/${devlog.id}`);
  };

  return (
    <PageLayout>
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
