'use client';

import React from 'react';
import { Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { DevlogList, PageLayout, OverviewStats } from '@/components';
import { useDevlogs } from '@/hooks/useDevlogs';
import { DevlogEntry, DevlogId, DevlogStats, DevlogStatus, DevlogType, DevlogPriority } from '@devlog/types';
import { useRouter } from 'next/navigation';

export function DevlogListPage() {
  const { devlogs, loading, deleteDevlog } = useDevlogs();
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

  // Calculate stats from devlogs array
  const calculateStats = (): DevlogStats => {
    const byStatus = devlogs.reduce(
      (acc, devlog) => {
        acc[devlog.status] = (acc[devlog.status] || 0) + 1;
        return acc;
      },
      {} as Record<DevlogStatus, number>,
    );

    const byType = devlogs.reduce(
      (acc, devlog) => {
        acc[devlog.type] = (acc[devlog.type] || 0) + 1;
        return acc;
      },
      {} as Record<DevlogType, number>,
    );

    const byPriority = devlogs.reduce(
      (acc, devlog) => {
        acc[devlog.priority] = (acc[devlog.priority] || 0) + 1;
        return acc;
      },
      {} as Record<DevlogPriority, number>,
    );

    return {
      totalEntries: devlogs.length,
      byStatus,
      byType,
      byPriority,
    };
  };

  const stats = calculateStats();

  const actions = (
    <Space size="large" wrap>
      <OverviewStats stats={stats} variant="detailed" />
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
      />
    </PageLayout>
  );
}
