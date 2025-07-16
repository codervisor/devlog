'use client';

import React, { useEffect, useState } from 'react';
import { Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { DevlogList, PageLayout, OverviewStats, Pagination } from '@/components';
import { useDevlogsWithSearch } from '@/hooks/useDevlogsWithSearch';
import { useStats } from '@/hooks/useStats';
import { DevlogEntry, DevlogId, DevlogStatus, FilterType } from '@devlog/core';
import { useRouter } from 'next/navigation';
import styles from './DevlogListPage.module.css';

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
    changeSorting,
  } = useDevlogsWithSearch();
  
  // Use server-side stats that are independent of current filter state
  // Stats should represent the overall system state, not the filtered view
  const { stats, loading: isLoadingStats, refetch: refetchStats } = useStats();
  
  const router = useRouter();

  const handleViewDevlog = (devlog: DevlogEntry) => {
    router.push(`/devlogs/${devlog.id}`);
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
    router.push('/devlogs/create');
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

  const handleStatusFilter = (status: FilterType) => {
    if (status === 'total') {
      // Clear status filter but keep other filters
      setFilters({ ...filters, status: undefined });
    } else if (status === 'open') {
      // Open includes: new, in-progress, blocked, in-review, testing
      const openStatuses: DevlogStatus[] = ['new', 'in-progress', 'blocked', 'in-review', 'testing'];
      setFilters({
        ...filters,
        status: openStatuses,
      });
    } else if (status === 'closed') {
      // Closed includes: done, cancelled
      const closedStatuses: DevlogStatus[] = ['done', 'cancelled'];
      setFilters({
        ...filters,
        status: closedStatuses,
      });
    } else {
      // Individual status - toggle behavior for direct status selection
      const currentStatuses = filters.status || [];
      if (currentStatuses.includes(status)) {
        // Remove this status
        const newStatuses = currentStatuses.filter(s => s !== status);
        setFilters({
          ...filters,
          status: newStatuses.length > 0 ? newStatuses : undefined,
        });
      } else {
        // Add this status (replace existing for single selection)
        setFilters({
          ...filters,
          status: [status],
        });
      }
    }
  };

  const actions = (
    <Space size="large" wrap>
      <OverviewStats 
        stats={stats} 
        loading={isLoadingStats}
        variant="detailed" 
        currentFilters={filters}
        onFilterToggle={handleStatusFilter}
        collapsible={true}
        defaultCollapsed={false}
      />
      <Button 
        type="primary" 
        icon={<PlusOutlined />} 
        onClick={handleCreateDevlog}
      >
        Create Devlog
      </Button>
    </Space>
  );

  return (
    <PageLayout actions={actions}>
      <div className="space-y-4">
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
        />
        
        {/* Show pagination if we have paginated data */}
        {pagination && (
          <div className="mt-4 pt-4 border-t">
            <Pagination
              pagination={pagination}
              onPageChange={goToPage}
              onPageSizeChange={changePageSize}
              className="justify-center"
            />
          </div>
        )}
      </div>
    </PageLayout>
  );
}
