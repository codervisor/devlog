'use client';

import React, { useEffect } from 'react';
import { Dashboard } from '@/components';
import { useDevlogStore, useProjectStore } from '@/stores';
import { useDevlogEvents } from '@/hooks/use-realtime';
import { DevlogEntry } from '@codervisor/devlog-core';
import { useRouter } from 'next/navigation';

interface ProjectDetailsPageProps {
  projectId: number;
}

export function ProjectDetailsPage({ projectId }: ProjectDetailsPageProps) {
  const router = useRouter();

  const { currentProjectId, setCurrentProjectId } = useProjectStore();

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
    setCurrentProjectId(projectId);
  }, [projectId]);

  useEffect(() => {
    if (currentProjectId) {
      fetchAll();
    }
  }, [currentProjectId]);

  const handleViewDevlog = (devlog: DevlogEntry) => {
    router.push(`/projects/${projectId}/devlogs/${devlog.id}`);
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
