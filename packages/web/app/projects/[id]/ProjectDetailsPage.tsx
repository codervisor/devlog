'use client';

import React, { useEffect } from 'react';
import { Dashboard, PageLayout } from '@/components';
import { useProject } from '@/hooks/use-stores';
import { useDevlogContext } from '@/hooks/use-stores';
import { DevlogEntry } from '@codervisor/devlog-core';
import { useRouter } from 'next/navigation';

interface ProjectDetailsPageProps {
  projectId: number;
}

export function ProjectDetailsPage({ projectId }: ProjectDetailsPageProps) {
  const { currentProject, projects, setCurrentProject } = useProject();
  const {
    devlogs: filteredDevlogs,
    loading: isLoadingDevlogs,
    stats,
    statsLoading: isLoadingStats,
    timeSeriesStats: timeSeriesData,
    timeSeriesLoading: isLoadingTimeSeries,
  } = useDevlogContext();
  const router = useRouter();

  // Set the current project based on the route parameter when projects are available
  // This is essential for the context to work with the correct project
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
