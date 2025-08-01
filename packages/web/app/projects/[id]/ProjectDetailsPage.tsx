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
  const { currentProjectId, setCurrentProjectId } = useProjectStore();
  const {
    devlogsContext,
    statsContext,
    timeSeriesStatsContext,
    fetchDevlogs,
    fetchStats,
    fetchTimeSeriesStats,
  } = useDevlogStore();

  const router = useRouter();

  useEffect(() => {
    setCurrentProjectId(projectId);
  }, [projectId]);

  useEffect(() => {
    if (currentProjectId) {
      fetchTimeSeriesStats();
      fetchStats();
      fetchDevlogs();
    }
  }, [currentProjectId]);

  const handleViewDevlog = (devlog: DevlogEntry) => {
    router.push(`/projects/${projectId}/devlogs/${devlog.id}`);
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
