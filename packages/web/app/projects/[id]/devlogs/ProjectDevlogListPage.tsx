'use client';

import React, { useEffect } from 'react';
import { DevlogList, PageLayout, Pagination } from '@/components';
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
    setFilters,
    deleteDevlog,
    batchUpdate,
    batchDelete,
    goToPage,
    changePageSize,
  } = useDevlogStore();

  useEffect(() => {
    setCurrentProjectId(projectId);
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
    <PageLayout>
      <DevlogList
        devlogs={devlogsContext.data || []}
        loading={devlogsContext.loading}
        onViewDevlog={handleViewDevlog}
        onDeleteDevlog={handleDeleteDevlog}
        onBatchUpdate={handleBatchUpdate}
        onBatchDelete={handleBatchDelete}
        currentFilters={devlogsContext.filters}
        onFilterChange={setFilters}
        pagination={devlogsContext.pagination}
        onPageChange={goToPage}
        onPageSizeChange={changePageSize}
      />
    </PageLayout>
  );
}
