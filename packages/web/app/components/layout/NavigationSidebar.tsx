'use client';

import React, { useEffect, useState } from 'react';
import { Button, Layout, Menu, Tooltip } from 'antd';
import {
  AppstoreOutlined,
  DashboardOutlined,
  FileTextOutlined,
  LeftOutlined,
  PlusOutlined,
  RightOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { DevlogStats } from '@devlog/core';
import { OverviewStats, WorkspaceSwitcher } from '@/components';
import styles from './NavigationSidebar.module.css';

const { Sider } = Layout;

interface NavigationSidebarProps {
  stats?: DevlogStats | null;
  statsLoading?: boolean;
  collapsed?: boolean;
  connected: boolean;
  onToggle?: () => void;
}

export function NavigationSidebar({
  stats,
  statsLoading = false,
  collapsed = false,
  connected,
  onToggle,
}: NavigationSidebarProps) {
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
    if (pathname === '/workspaces') return 'workspaces';
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
    {
      key: 'workspaces',
      label: 'Workspaces',
      icon: <AppstoreOutlined />,
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
      case 'workspaces':
        router.push('/workspaces');
        break;
    }
  };

  // Don't render menu items until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <Sider
        width={280}
        collapsed={collapsed}
        collapsedWidth={60}
        breakpoint="md"
        collapsible={false}
        trigger={null}
        style={{
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarBrand}>
            <Image src="/devlog-logo-text.svg" alt="Devlog Logo" width={200} height={24} />
          </div>
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.sidebarFooterContent}>
            {onToggle && (
              <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="top">
                <Button
                  type="text"
                  icon={collapsed ? <RightOutlined /> : <LeftOutlined />}
                  onClick={onToggle}
                  className={styles.sidebarToggle}
                  size="small"
                />
              </Tooltip>
            )}
          </div>
        </div>
      </Sider>
    );
  }

  return (
    <Sider
      width={280}
      collapsed={collapsed}
      collapsedWidth={60}
      breakpoint="md"
      collapsible={false}
      trigger={null}
      style={{
        background: '#fff',
        borderRight: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarBrand}>
          {collapsed ? (
            <Image
              src="/devlog-logo.svg"
              alt="Devlog Logo"
              width={24}
              height={24}
              className={styles.sidebarBrandIcon}
            />
          ) : (
            <Image
              src="/devlog-logo-text.svg"
              alt="Devlog Logo"
              width={(200 / 64) * 48}
              height={24}
              className={styles.sidebarBrandIcon}
            />
          )}
        </div>
      </div>

      <div
        className={
          collapsed ? styles.workspaceSwitcherContainerCollapsed : styles.workspaceSwitcherContainer
        }
      >
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      <Menu
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        style={{ borderRight: 0, flex: 1 }}
        items={menuItems}
        onClick={handleMenuClick}
      />

      <div className={styles.sidebarFooter}>
        <div className={styles.sidebarFooterContent}>
          {!collapsed && (
            <div className={styles.sidebarFooterContentLeft}>
              <Tooltip
                title={connected ? 'Connected to MCP server' : 'Disconnected from MCP server'}
                placement="top"
              >
                <WifiOutlined
                  style={{
                    color: connected ? '#52c41a' : '#ff4d4f',
                    fontSize: '16px',
                    cursor: 'default',
                  }}
                />
              </Tooltip>

              {(stats || statsLoading) && (
                <OverviewStats stats={stats || null} loading={statsLoading} variant="icon" />
              )}
            </div>
          )}

          <div className={styles.sidebarFooterContentRight}>
            {onToggle && (
              <Button
                type="text"
                icon={collapsed ? <RightOutlined /> : <LeftOutlined />}
                onClick={onToggle}
                className={styles.sidebarToggle}
                size="small"
              />
            )}
          </div>
        </div>
      </div>
    </Sider>
  );
}
