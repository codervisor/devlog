'use client';

import React from 'react';
import { Dashboard, PageLayout } from '@/components';
import { useDevlogs } from '@/hooks/useDevlogs';
import { useStats } from '@/hooks/useStats';
import { useTimeSeriesStats } from '@/hooks/useTimeSeriesStats';
import { DevlogEntry } from '@codervisor/devlog-core';
import { useRouter } from 'next/navigation';

export function DashboardPage() {
  const { devlogs, loading: isLoadingDevlogs } = useDevlogs();
  const { stats, loading: isLoadingStats } = useStats();
  const { timeSeriesData, loading: isLoadingTimeSeries } = useTimeSeriesStats();
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
        recentDevlogs={devlogs.slice(0, 10)}
        isLoadingDevlogs={isLoadingDevlogs}
        onViewDevlog={handleViewDevlog}
      />
    </PageLayout>
  );
}
