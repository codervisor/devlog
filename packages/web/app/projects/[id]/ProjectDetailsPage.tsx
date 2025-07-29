'use client';

import React, { useEffect } from 'react';
import { Dashboard, PageLayout, OverviewStats } from '@/components';
import { useProject } from '@/contexts/ProjectContext';
import { useDevlogs } from '@/hooks/useDevlogs';
import { useStats } from '@/hooks/useStats';
import { useTimeSeriesStats } from '@/hooks/useTimeSeriesStats';
import { DevlogEntry } from '@codervisor/devlog-core';
import { useRouter } from 'next/navigation';

interface ProjectDetailsPageProps {
  projectId: string;
}

export function ProjectDetailsPage({ projectId }: ProjectDetailsPageProps) {
  const { currentProject, projects, setCurrentProject } = useProject();
  const { devlogs, filters, handleStatusFilter, loading: isLoadingDevlogs } = useDevlogs();
  const { stats, loading: isLoadingStats } = useStats();
  const { timeSeriesData, loading: isLoadingTimeSeries } = useTimeSeriesStats();
  const router = useRouter();

  // Set the current project based on the route parameter
  useEffect(() => {
    const numericProjectId = parseInt(projectId, 10);
    const project = projects.find((p) => p.id === numericProjectId);
    if (project && (!currentProject || currentProject.projectId !== numericProjectId)) {
      setCurrentProject({
        projectId: project.id,
        project,
      });
    }
  }, [projectId, projects, currentProject, setCurrentProject]);

  const handleViewDevlog = (devlog: DevlogEntry) => {
    router.push(`/projects/${projectId}/devlogs/${devlog.id}`);
  };

  // Don't render until we have the correct project context
  const numericProjectId = parseInt(projectId, 10);
  if (!currentProject || currentProject.projectId !== numericProjectId) {
    return (
      <PageLayout>
        <div>Loading project...</div>
      </PageLayout>
    );
  }

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
