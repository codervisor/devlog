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
import { DevlogStats } from '@codervisor/devlog-core';
import { OverviewStats } from '@/components';
import { useProject } from '@/contexts/ProjectContext';
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
  const { currentProject } = useProject();

  // Handle client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if sidebar should be hidden
  const shouldHideSidebar = () => {
    if (!mounted) return false;
    // Hide sidebar on /projects page
    return pathname === '/projects';
  };

  // Get contextual menu items based on current path
  const getMenuItems = () => {
    if (!mounted) return [];
    
    const pathParts = pathname.split('/').filter(Boolean);
    
    // Dashboard page (/)
    if (pathname === '/') {
      return [
        {
          key: 'projects',
          label: 'Projects',
          icon: <AppstoreOutlined />,
        },
      ];
    }
    
    // Project detail page (/projects/[id])
    if (pathParts.length === 2 && pathParts[0] === 'projects') {
      return [
        {
          key: 'dashboard',
          label: 'Dashboard',
          icon: <DashboardOutlined />,
        },
        {
          key: 'list',
          label: 'Devlogs',
          icon: <FileTextOutlined />,
        },
        {
          key: 'create',
          label: 'New Devlog',
          icon: <PlusOutlined />,
        },
      ];
    }
    
    // Project devlogs page (/projects/[id]/devlogs)
    if (pathParts.length === 3 && pathParts[0] === 'projects' && pathParts[2] === 'devlogs') {
      return [
        {
          key: 'dashboard',
          label: 'Dashboard',
          icon: <DashboardOutlined />,
        },
        {
          key: 'create',
          label: 'New Devlog',
          icon: <PlusOutlined />,
        },
      ];
    }
    
    // Devlog detail page (/projects/[id]/devlogs/[devlogId])
    if (pathParts.length === 4 && pathParts[0] === 'projects' && pathParts[2] === 'devlogs') {
      return [
        {
          key: 'dashboard',
          label: 'Dashboard',
          icon: <DashboardOutlined />,
        },
        {
          key: 'list',
          label: 'Back to Devlogs',
          icon: <FileTextOutlined />,
        },
        {
          key: 'create',
          label: 'New Devlog',
          icon: <PlusOutlined />,
        },
      ];
    }
    
    // Devlog create page (/projects/[id]/devlogs/create)
    if (pathParts.length === 4 && pathParts[0] === 'projects' && pathParts[3] === 'create') {
      return [
        {
          key: 'dashboard',
          label: 'Dashboard',
          icon: <DashboardOutlined />,
        },
        {
          key: 'list',
          label: 'Back to Devlogs',
          icon: <FileTextOutlined />,
        },
      ];
    }
    
    // Default fallback
    return [
      {
        key: 'dashboard',
        label: 'Dashboard',
        icon: <DashboardOutlined />,
      },
      {
        key: 'projects',
        label: 'Projects',
        icon: <AppstoreOutlined />,
      },
    ];
  };

  // Determine selected key based on current pathname and menu items
  const getSelectedKey = () => {
    if (!mounted) return 'dashboard';
    
    const pathParts = pathname.split('/').filter(Boolean);
    
    if (pathname === '/') return 'projects';
    if (pathParts.length === 2 && pathParts[0] === 'projects') return 'dashboard';
    if (pathParts.length === 3 && pathParts[2] === 'devlogs') return 'list';
    if (pathParts.length === 4 && pathParts[3] === 'create') return 'create';
    if (pathParts.length === 4 && pathParts[2] === 'devlogs') return 'list';
    
    return 'dashboard';
  };

  const handleMenuClick = ({ key }: { key: string }) => {
    if (!mounted) return;

    switch (key) {
      case 'dashboard':
        router.push('/');
        break;
      case 'projects':
        router.push('/projects');
        break;
      case 'list':
        // If a project is selected, go to that project's devlogs
        // Otherwise, redirect to projects to select one first
        if (currentProject) {
          router.push(`/projects/${currentProject.projectId}/devlogs`);
        } else {
          router.push('/projects');
        }
        break;
      case 'create':
        // If a project is selected, create within that project
        // Otherwise, redirect to projects to select one first
        if (currentProject) {
          router.push(`/projects/${currentProject.projectId}/devlogs/create`);
        } else {
          router.push('/projects');
        }
        break;
    }
  };

  // Don't render menu items until mounted to prevent hydration issues
  if (!mounted || shouldHideSidebar()) {
    return null;
  }

  const menuItems = getMenuItems();

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
      {/* Remove the brand/logo section since it's now in the top navbar */}
      
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
