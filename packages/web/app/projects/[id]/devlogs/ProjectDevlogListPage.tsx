'use client';

import React, { useEffect } from 'react';
import { DevlogList, PageLayout, Pagination } from '@/components';
import { useDevlogData } from '@/hooks/useDevlogData';
import { useProject } from '@/contexts/ProjectContext';
import { DevlogEntry, DevlogId } from '@codervisor/devlog-core';
import { useRouter } from 'next/navigation';

interface ProjectDevlogListPageProps {
  projectId: number;
}

export function ProjectDevlogListPage({ projectId }: ProjectDevlogListPageProps) {
  const { currentProject, projects, setCurrentProject } = useProject();
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

  const {
    filteredDevlogs,
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
  } = useDevlogData({ projectId, useContext: false });

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

  const handleBatchAddNote = async (ids: DevlogId[], content: string, category?: string) => {
    try {
      await batchAddNote(ids, content, category);
      // Note: Adding notes doesn't change stats, so no need to refetch
    } catch (error) {
      console.error('Failed to batch add notes:', error);
      throw error;
    }
  };

  return (
    <PageLayout>
      <DevlogList
        devlogs={filteredDevlogs}
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
