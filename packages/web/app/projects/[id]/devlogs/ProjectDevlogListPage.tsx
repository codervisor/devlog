'use client';

import React, { useEffect } from 'react';
import { DevlogList } from '@/components';
import { useDevlogStore, useProjectStore } from '@/stores';
import { DevlogEntry, DevlogId } from '@codervisor/devlog-core';
import { useRouter } from 'next/navigation';

interface ProjectDevlogListPageProps {
  projectId: number;
}

export function ProjectDevlogListPage({ projectId }: ProjectDevlogListPageProps) {
  const router = useRouter();

  const { setCurrentProjectId } = useProjectStore();

  const {
    devlogsContext,
    fetchDevlogs,
    setFilters,
    deleteDevlog,
    batchUpdate,
    batchDelete,
    goToPage,
    changePageSize,
  } = useDevlogStore();

  useEffect(() => {
    setCurrentProjectId(projectId);
    fetchDevlogs();
  }, [projectId]);

  const handleViewDevlog = (devlog: DevlogEntry) => {
    router.push(`/projects/${projectId}/devlogs/${devlog.id}`);
  };

  const handleDeleteDevlog = async (id: DevlogId) => {
    try {
      await deleteDevlog(id);
    } catch (error) {
      console.error('Failed to delete devlog:', error);
    }
  };

  const handleBatchUpdate = async (ids: DevlogId[], updates: any) => {
    try {
      await batchUpdate(ids, updates);
    } catch (error) {
      console.error('Failed to batch update devlogs:', error);
      throw error;
    }
  };

  const handleBatchDelete = async (ids: DevlogId[]) => {
    try {
      await batchDelete(ids);
    } catch (error) {
      console.error('Failed to batch delete devlogs:', error);
      throw error;
    }
  };

  return (
    <DevlogList
      devlogContext={devlogsContext}
      onViewDevlog={handleViewDevlog}
      onDeleteDevlog={handleDeleteDevlog}
      onBatchUpdate={handleBatchUpdate}
      onBatchDelete={handleBatchDelete}
      onFilterChange={setFilters}
      onPageChange={goToPage}
      onPageSizeChange={changePageSize}
    />
  );
}
