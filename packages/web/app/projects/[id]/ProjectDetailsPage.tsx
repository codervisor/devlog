'use client';

import React, { useEffect } from 'react';
import { Dashboard, PageLayout } from '@/components';
import { useProject } from '@/contexts/ProjectContext';
import { useDevlogData } from '@/hooks/useDevlogData';
import { useStats, useTimeSeriesStats } from '@/hooks/useStatsData';
import { DevlogEntry } from '@codervisor/devlog-core';
import { useRouter } from 'next/navigation';

interface ProjectDetailsPageProps {
  projectId: number;
}

export function ProjectDetailsPage({ projectId }: ProjectDetailsPageProps) {
  const { currentProject, projects, setCurrentProject } = useProject();
  const { filteredDevlogs, loading: isLoadingDevlogs } = useDevlogData({
    projectId,
    useContext: false,
  });
  const { stats, loading: isLoadingStats } = useStats({ projectId, useContext: false });
  const { timeSeriesData, loading: isLoadingTimeSeries } = useTimeSeriesStats({
    projectId,
    useContext: false,
  });
  const router = useRouter();

  // Set the current project based on the route parameter when projects are available
  // This is optional and only for UI context (breadcrumbs, navigation, etc.)
  useEffect(() => {
    const project = projects.find((p) => p.id === projectId);
    if (project && (!currentProject || currentProject.projectId !== projectId)) {
      setCurrentProject({
        projectId: project.id,
        project,
      });
    }
  }, [projectId, projects, currentProject, setCurrentProject]);

  const handleViewDevlog = (devlog: DevlogEntry) => {
    router.push(`/projects/${projectId}/devlogs/${devlog.id}`);
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
