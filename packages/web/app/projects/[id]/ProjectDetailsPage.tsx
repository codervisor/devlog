'use client';

import React, { useEffect } from 'react';
import { Dashboard, PageLayout } from '@/components';
import { useDevlogStore, useProjectStore } from '@/stores';
import { DevlogEntry } from '@codervisor/devlog-core';
import { useRouter } from 'next/navigation';

interface ProjectDetailsPageProps {
  projectId: number;
}

export function ProjectDetailsPage({ projectId }: ProjectDetailsPageProps) {
  const { setCurrentProjectId } = useProjectStore();

  const { devlogsContext, statsContext, timeSeriesStatsContext } = useDevlogStore();

  const router = useRouter();

  useEffect(() => {
    setCurrentProjectId(projectId);
  }, [projectId]);

  const handleViewDevlog = (devlog: DevlogEntry) => {
    router.push(`/projects/${projectId}/devlogs/${devlog.id}`);
  };

  return (
    <PageLayout>
      <Dashboard
        stats={statsContext.data}
        timeSeriesData={timeSeriesStatsContext.data}
        isLoadingTimeSeries={timeSeriesStatsContext.loading}
        recentDevlogs={devlogsContext.data?.slice(0, 20) || []}
        isLoadingDevlogs={devlogsContext.loading}
        onViewDevlog={handleViewDevlog}
      />
    </PageLayout>
  );
}
