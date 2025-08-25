'use client';

import React, { useEffect } from 'react';
import { useDevlogStore, useProjectStore } from '@/stores';
import { useDevlogEvents } from '@/hooks/use-realtime';
import { DevlogEntry, DevlogId } from '@codervisor/devlog-core';
import { useRouter } from 'next/navigation';
import { useProjectName } from '@/components/provider/project-provider';
import { DevlogList } from '@/components/feature/devlog/devlog-list';

export function DevlogListPage() {
  const projectName = useProjectName();
  const router = useRouter();

  const { currentProjectName, setCurrentProjectName } = useProjectStore();

  const {
    devlogsContext,
    fetchDevlogs,
    setDevlogsFilters,
    setDevlogsPagination,
    deleteDevlog,
    batchUpdate,
    batchDelete,
  } = useDevlogStore();

  const { onDevlogCreated, onDevlogUpdated, onDevlogDeleted } = useDevlogEvents();

  useEffect(() => {
    const unsubscribeCreated = onDevlogCreated(fetchDevlogs);
    const unsubscribeUpdated = onDevlogUpdated(fetchDevlogs);
    const unsubscribeDeleted = onDevlogDeleted(fetchDevlogs);

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, [onDevlogCreated, onDevlogUpdated, onDevlogDeleted, fetchDevlogs]);

  useEffect(() => {
    setCurrentProjectName(projectName);
  }, [projectName]);

  useEffect(() => {
    fetchDevlogs();
  }, [
    currentProjectName,
    devlogsContext.filters.search,
    devlogsContext.filters.type,
    devlogsContext.filters.status,
    devlogsContext.filters.priority,
    devlogsContext.pagination.page,
    devlogsContext.pagination.limit,
  ]);

  const handleViewDevlog = (devlog: DevlogEntry) => {
    router.push(`/projects/${projectName}/devlogs/${devlog.id}`);
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
      console.error('Failed to batch update devlog:', error);
      throw error;
    }
  };

  const handleBatchDelete = async (ids: DevlogId[]) => {
    try {
      await batchDelete(ids);
    } catch (error) {
      console.error('Failed to batch delete devlog:', error);
      throw error;
    }
  };

  const goToPage = (page: number) => {
    setDevlogsPagination({
      ...devlogsContext.pagination,
      page: page,
    });
  };

  const changePageSize = (size: number) => {
    setDevlogsPagination({
      ...devlogsContext.pagination,
      limit: size,
      page: 1, // Reset to first page when changing page size
    });
  };

  return (
    <DevlogList
      devlogContext={devlogsContext}
      onViewDevlog={handleViewDevlog}
      onDeleteDevlog={handleDeleteDevlog}
      onBatchUpdate={handleBatchUpdate}
      onBatchDelete={handleBatchDelete}
      onFilterChange={setDevlogsFilters}
      onPageChange={goToPage}
      onPageSizeChange={changePageSize}
    />
  );
}
