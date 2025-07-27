'use client';

import React from 'react';
import { Dashboard, PageLayout, OverviewStats } from '@/components';
import { useDevlogs } from '@/hooks/useDevlogs';
import { useStats } from '@/hooks/useStats';
import { useTimeSeriesStats } from '@/hooks/useTimeSeriesStats';
import { DevlogEntry } from '@codervisor/devlog-core';
import { useRouter } from 'next/navigation';

export function DashboardPage() {
  const { devlogs, filters, handleStatusFilter, loading: isLoadingDevlogs } = useDevlogs();
  const { stats, loading: isLoadingStats } = useStats();
  const { timeSeriesData, loading: isLoadingTimeSeries } = useTimeSeriesStats();
  const router = useRouter();

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
