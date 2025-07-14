'use client';

import React, { useEffect, useState } from 'react';
import { Layout, Menu, Typography } from 'antd';
import { DashboardOutlined, FileTextOutlined, PlusOutlined } from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { DevlogStats } from '@devlog/types';
import { OverviewStats } from '@/components';
import styles from './NavigationSidebar.module.css';

const { Sider } = Layout;
const { Title, Text } = Typography;

interface NavigationSidebarProps {
  stats?: DevlogStats | null;
  collapsed?: boolean;
}

export function NavigationSidebar({ stats, collapsed = false }: NavigationSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Handle client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine selected key based on current pathname
  const getSelectedKey = () => {
    if (!mounted) return 'dashboard'; // Fallback during SSR
    if (pathname === '/') return 'dashboard';
    if (pathname === '/devlogs') return 'list';
    if (pathname === '/devlogs/create') return 'create';
    if (pathname.startsWith('/devlogs/')) return 'list'; // For individual devlog pages
    return 'dashboard';
  };

  const menuItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardOutlined />,
    },
    {
      key: 'list',
      label: 'All Devlogs',
      icon: <FileTextOutlined />,
    },
    {
      key: 'create',
      label: 'New Devlog',
      icon: <PlusOutlined />,
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    if (!mounted) return;

    switch (key) {
      case 'dashboard':
        router.push('/');
        break;
      case 'list':
        router.push('/devlogs');
        break;
      case 'create':
        router.push('/devlogs/create');
        break;
    }
  };

  // Don't render menu items until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <Sider
        width={280}
        collapsed={collapsed}
        collapsedWidth={0}
        breakpoint="md"
        collapsible={false}
        trigger={null}
        style={{
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
        }}
      >
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarBrand}>
            <Image
              src="/devlog-logo-text.svg"
              alt="Devlog Logo"
              width={240}
              height={24}
              className={styles.sidebarBrandIcon}
            />
            {/* <Title level={3} className={styles.sidebarBrandTitle}>
              Devlog
            </Title> */}
          </div>
          <Text type="secondary">Development Tracker</Text>
        </div>
      </Sider>
    );
  }

  return (
    <Sider
      width={280}
      collapsed={collapsed}
      collapsedWidth={0}
      breakpoint="md"
      collapsible={false}
      trigger={null}
      style={{
        background: '#fff',
        borderRight: '1px solid #f0f0f0',
      }}
    >
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarBrand}>
          <Image src="/devlog-logo-text.svg" alt="Devlog Logo" width={200} height={24} />
        </div>
        <Text type="secondary">AI Development Tracker</Text>
      </div>

      <Menu
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        style={{ borderRight: 0 }}
        items={menuItems}
        onClick={handleMenuClick}
      />

      <OverviewStats stats={stats || null} variant="compact" title="QUICK STATS" />
    </Sider>
  );
}
