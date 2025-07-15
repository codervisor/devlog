'use client';

import React, { useEffect, useState } from 'react';
import { Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { DevlogList, PageLayout, OverviewStats } from '@/components';
import { useDevlogs } from '@/hooks/useDevlogs';
import { useDevlogFilters } from '@/hooks/useDevlogFilters';
import { DevlogEntry, DevlogId, DevlogStats } from '@devlog/core';
import { useRouter } from 'next/navigation';

export function DevlogListPage() {
  const { devlogs, loading, deleteDevlog } = useDevlogs();
  const { filters, filteredDevlogs, handleStatusFilter, setFilters } = useDevlogFilters(devlogs);
  const [stats, setStats] = useState<DevlogStats | null>(null);
  const router = useRouter();

  // Fetch stats from API like Dashboard does for consistency
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/devlogs/stats/overview');
        if (response.ok) {
          const statsData = await response.json();
          setStats(statsData);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
  }, [devlogs]);

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

  const actions = (
    <Space size="large" wrap>
      <OverviewStats 
        stats={stats} 
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
