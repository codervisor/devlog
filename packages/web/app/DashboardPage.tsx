'use client';

import React from 'react';
import { Dashboard, PageLayout } from '@/components';
import { useDevlogContext } from '@/hooks/use-stores';
import { DevlogEntry } from '@codervisor/devlog-core';
import { useRouter } from 'next/navigation';

export function DashboardPage() {
  const {
    devlogs: filteredDevlogs,
    loading: isLoadingDevlogs,
    stats,
    statsLoading: isLoadingStats,
    timeSeriesStats: timeSeriesData,
    timeSeriesLoading: isLoadingTimeSeries,
  } = useDevlogContext();
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
