'use client';

import React from 'react';
import { Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { DevlogList, PageLayout, OverviewStats } from '@/components';
import { useDevlogs } from '@/hooks/useDevlogs';
import { useDevlogFilters } from '@/hooks/useDevlogFilters';
import { DevlogEntry, DevlogId, DevlogStats, DevlogStatus, DevlogType, DevlogPriority } from '@devlog/types';
import { useRouter } from 'next/navigation';

export function DevlogListPage() {
  const { devlogs, loading, deleteDevlog } = useDevlogs();
  const { filters, filteredDevlogs, handleStatusFilter, setFilters } = useDevlogFilters(devlogs);
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

  const handleCreateDevlog = () => {
    router.push('/devlogs/create');
  };

  // Calculate stats from filtered devlogs
  const calculateStats = (): DevlogStats => {
    const dataSource = filteredDevlogs;
    
    const byStatus = dataSource.reduce(
      (acc, devlog) => {
        acc[devlog.status] = (acc[devlog.status] || 0) + 1;
        return acc;
      },
      {} as Record<DevlogStatus, number>,
    );

    const byType = dataSource.reduce(
      (acc, devlog) => {
        acc[devlog.type] = (acc[devlog.type] || 0) + 1;
        return acc;
      },
      {} as Record<DevlogType, number>,
    );

    const byPriority = dataSource.reduce(
      (acc, devlog) => {
        acc[devlog.priority] = (acc[devlog.priority] || 0) + 1;
        return acc;
      },
      {} as Record<DevlogPriority, number>,
    );

    return {
      totalEntries: dataSource.length,
      byStatus,
      byType,
      byPriority,
    };
  };

  const stats = calculateStats();

  const actions = (
    <Space size="large" wrap>
      <OverviewStats 
        stats={stats} 
        variant="detailed" 
        currentFilters={filters}
        onFilterToggle={handleStatusFilter}
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
        devlogs={filteredDevlogs}
        loading={loading}
        onViewDevlog={handleViewDevlog}
        onDeleteDevlog={handleDeleteDevlog}
        currentFilters={filters}
        onFilterChange={setFilters}
      />
    </PageLayout>
  );
}
