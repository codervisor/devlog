'use client';

import React, { useEffect } from 'react';
import { Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { DevlogList, PageLayout, OverviewStats, Pagination } from '@/components';
import { useDevlogs } from '@/hooks/useDevlogs';
import { useStats } from '@/hooks/useStats';
import { useProject } from '@/contexts/ProjectContext';
import { DevlogEntry, DevlogId } from '@codervisor/devlog-core';
import { useRouter } from 'next/navigation';

interface ProjectDevlogListPageProps {
  projectId: string;
}

export function ProjectDevlogListPage({ projectId }: ProjectDevlogListPageProps) {
  const { currentProject, projects, setCurrentProject } = useProject();
  const router = useRouter();

  // Set the current project based on the route parameter
  useEffect(() => {
    const project = projects.find(p => p.id === projectId);
    if (project && (!currentProject || currentProject.projectId !== projectId)) {
      setCurrentProject({
        projectId: project.id,
        project,
        isDefault: project.id === 'default',
      });
    }
  }, [projectId, projects, currentProject, setCurrentProject]);

  const {
    devlogs,
    pagination,
    loading,
    filters,
    setFilters,
    deleteDevlog,
    batchUpdate,
    batchDelete,
    batchAddNote,
    goToPage,
    changePageSize,
    handleStatusFilter,
  } = useDevlogs();

  // Use server-side stats that are independent of current filter state
  // Stats should represent the overall system state, not the filtered view
  const { stats, loading: isLoadingStats, refetch: refetchStats } = useStats();

  const handleViewDevlog = (devlog: DevlogEntry) => {
    router.push(`/projects/${projectId}/devlogs/${devlog.id}`);
  };

  const handleDeleteDevlog = async (id: DevlogId) => {
    try {
      await deleteDevlog(id);
      // Refresh stats after delete operation
      await refetchStats();
    } catch (error) {
      console.error('Failed to delete devlog:', error);
    }
  };

  const handleBatchUpdate = async (ids: DevlogId[], updates: any) => {
    try {
      await batchUpdate(ids, updates);
      // Refresh stats after batch update operation
      await refetchStats();
    } catch (error) {
      console.error('Failed to batch update devlogs:', error);
      throw error;
    }
  };

  const handleBatchDelete = async (ids: DevlogId[]) => {
    try {
      await batchDelete(ids);
      // Refresh stats after batch delete operation
      await refetchStats();
    } catch (error) {
      console.error('Failed to batch delete devlogs:', error);
      throw error;
    }
  };

  const handleBatchAddNote = async (ids: DevlogId[], content: string, category?: string) => {
    try {
      await batchAddNote(ids, content, category);
      // Note: Adding notes doesn't change stats, so no need to refetch
    } catch (error) {
      console.error('Failed to batch add notes:', error);
      throw error;
    }
  };

  const handleCreateDevlog = () => {
    router.push(`/projects/${projectId}/devlogs/create`);
  };

  // Refresh stats when returning to this page (e.g., after creating/editing devlogs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refetchStats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetchStats]);

  // Don't render until we have the correct project context
  if (!currentProject || currentProject.projectId !== projectId) {
    return (
      <PageLayout>
        <div>Loading project...</div>
      </PageLayout>
    );
  }

  const actions = (
    <Space size="large" wrap>
      <OverviewStats
        stats={stats}
        loading={isLoadingStats}
        variant="detailed"
        currentFilters={filters}
        onFilterToggle={handleStatusFilter}
      />
      <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateDevlog}>
        Create Devlog
      </Button>
    </Space>
  );

  return (
    <PageLayout actions={actions}>
      <DevlogList
        devlogs={devlogs}
        loading={loading}
        onViewDevlog={handleViewDevlog}
        onDeleteDevlog={handleDeleteDevlog}
        onBatchUpdate={handleBatchUpdate}
        onBatchDelete={handleBatchDelete}
        onBatchAddNote={handleBatchAddNote}
        currentFilters={filters}
        onFilterChange={setFilters}
        pagination={pagination}
        onPageChange={goToPage}
        onPageSizeChange={changePageSize}
      />

      {/* TODO: Integrate proper pagination back into footer when backend pagination is implemented */}
      {false && pagination && (
        <div className="mt-4 pt-4 border-t">
          <Pagination
            pagination={pagination!}
            onPageChange={goToPage}
            onPageSizeChange={changePageSize}
            className="justify-center"
          />
        </div>
      )}
    </PageLayout>
  );
}
