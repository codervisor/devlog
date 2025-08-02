'use client';

import React from 'react';
import { Dashboard, PageLayout } from '@/components';
import { useDevlogStore } from '@/stores';
import { DevlogEntry } from '@codervisor/devlog-core';
import { useRouter } from 'next/navigation';

export function DashboardPage() {
  const { devlogsContext, statsContext, timeSeriesStatsContext } = useDevlogStore();
  const router = useRouter();

  const handleViewDevlog = (devlog: DevlogEntry) => {
    router.push(`/devlogs/${devlog.id}`);
  };

  return (
    <PageLayout>
      <Dashboard
        statsContext={statsContext}
        timeSeriesStatsContext={timeSeriesStatsContext}
        recentDevlogsContext={devlogsContext}
        onViewDevlog={handleViewDevlog}
      />
    </PageLayout>
  );
}
