'use client';

import React, { useEffect, useState } from 'react';
import { Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { DevlogList, PageLayout, OverviewStats } from '@/components';
import { useDevlogsWithSearch } from '@/hooks/useDevlogsWithSearch';
import { useStats } from '@/hooks/useStats';
import { DevlogEntry, DevlogId } from '@devlog/core';
import { useRouter } from 'next/navigation';
import styles from './DevlogListPage.module.css';

export function DevlogListPage() {
  const { 
    devlogs, 
    loading, 
    filters, 
    setFilters, 
    deleteDevlog, 
    batchUpdate, 
    batchDelete, 
    batchAddNote 
  } = useDevlogsWithSearch();
  const { stats, loading: isLoadingStats } = useStats([devlogs]);
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
    } catch (error) {
      console.error('Failed to batch add notes:', error);
      throw error;
    }
  };

  const handleCreateDevlog = () => {
    router.push('/devlogs/create');
  };

  const handleStatusFilter = (status: any) => {
    if (status === 'total') {
      // Clear status filter but keep other filters
      setFilters({ ...filters, status: undefined });
    } else {
      // Toggle status filter
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
    </PageLayout>
  );
}
