'use client';

import React, { useEffect } from 'react';
import { Dashboard } from '@/components';
import { useDevlogStore, useProjectStore, useRealtimeStore } from '@/stores';
import { DevlogEntry } from '@codervisor/devlog-core';
import { useRouter } from 'next/navigation';
import { SSEEventType } from '@/lib';

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

  const { connect, disconnect, subscribe, unsubscribe } = useRealtimeStore();

  const fetchAll = async () => {
    return await Promise.all([fetchTimeSeriesStats(), fetchStats(), fetchDevlogs()]);
  };

  useEffect(() => {
    connect();
    subscribe(SSEEventType.DEVLOG_CREATED, fetchAll);
    subscribe(SSEEventType.DEVLOG_UPDATED, fetchAll);
    subscribe(SSEEventType.DEVLOG_DELETED, fetchAll);
    return () => {
      unsubscribe(SSEEventType.DEVLOG_CREATED);
      unsubscribe(SSEEventType.DEVLOG_UPDATED);
      unsubscribe(SSEEventType.DEVLOG_DELETED);
      disconnect();
    };
  }, []);

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
