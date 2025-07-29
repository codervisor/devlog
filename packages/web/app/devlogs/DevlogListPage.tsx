'use client';

import React, { useEffect } from 'react';
import { DevlogList, PageLayout, Pagination } from '@/components';
import { useDevlogs } from '@/hooks/useDevlogs';
import { DevlogEntry, DevlogId } from '@codervisor/devlog-core';
import { useRouter } from 'next/navigation';

export function DevlogListPage() {
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
  } = useDevlogs();

  const router = useRouter();

  const handleViewDevlog = (devlog: DevlogEntry) => {
    router.push(`/devlogs/${devlog.id}`);
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
