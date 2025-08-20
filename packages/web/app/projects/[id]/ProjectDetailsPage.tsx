'use client';

import React, { useEffect } from 'react';
import { Dashboard } from '@/components';
import { useDevlogStore, useProjectStore } from '@/stores';
import { useDevlogEvents } from '@/hooks/use-realtime';
import { DevlogEntry, Project } from '@codervisor/devlog-core';
import { useRouter } from 'next/navigation';
import { useProjectName } from './ProjectProvider';

export function ProjectDetailsPage() {
  const projectName = useProjectName();
  const router = useRouter();

  const { currentProjectName, setCurrentProjectName } = useProjectStore();

  const {
    devlogsContext,
    statsContext,
    timeSeriesStatsContext,
    fetchDevlogs,
    fetchStats,
    fetchTimeSeriesStats,
  } = useDevlogStore();

  const { onDevlogCreated, onDevlogUpdated, onDevlogDeleted } = useDevlogEvents();

  const fetchAll = async () => {
    return await Promise.all([fetchTimeSeriesStats(), fetchStats(), fetchDevlogs()]);
  };

  useEffect(() => {
    const unsubscribeCreated = onDevlogCreated(fetchAll);
    const unsubscribeUpdated = onDevlogUpdated(fetchAll);
    const unsubscribeDeleted = onDevlogDeleted(fetchAll);

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, [onDevlogCreated, onDevlogUpdated, onDevlogDeleted]);

  useEffect(() => {
    setCurrentProjectName(projectName);
  }, [projectName]);

  useEffect(() => {
    if (currentProjectName) {
      fetchAll();
    }
  }, [currentProjectName]);

  const handleViewDevlog = (devlog: DevlogEntry) => {
    router.push(`/projects/${projectName}/devlogs/${devlog.id}`);
  };

  return (
    <Dashboard
      statsContext={statsContext}
      timeSeriesStatsContext={timeSeriesStatsContext}
      recentDevlogsContext={devlogsContext}
      onViewDevlog={handleViewDevlog}
    />
  );
}
