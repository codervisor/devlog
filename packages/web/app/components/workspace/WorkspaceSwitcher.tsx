'use client';

import React, { useEffect, useState } from 'react';
import { Avatar, Button, Dropdown, message, Tooltip, Typography } from 'antd';
import {
  CloudOutlined,
  DatabaseOutlined,
  DisconnectOutlined,
  DownOutlined,
  FileTextOutlined,
  GithubOutlined,
  PlusOutlined,
  SettingOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useServerSentEvents } from '@/hooks/useServerSentEvents';
import { useWorkspaceStorage } from '@/hooks/use-workspace-storage';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import styles from './WorkspaceSwitcher.module.css';

const { Text } = Typography;

interface WorkspaceMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  lastAccessedAt: string;
}

interface StorageConfig {
  type: 'json' | 'postgres' | 'mysql' | 'sqlite' | 'github';
  connectionString?: string;
  json?: {
    directory: string;
    global: boolean;
  };
  github?: {
    owner: string;
    repo: string;
    token: string;
  };
}

interface WorkspaceContext {
  workspaceId: string;
  workspace: WorkspaceMetadata;
  isDefault: boolean;
}

interface WorkspaceDetail {
  workspace: WorkspaceMetadata;
  storage: StorageConfig;
  connectionStatus: {
    connected: boolean;
    error?: string;
  };
}

interface WorkspacesResponse {
  workspaces: WorkspaceMetadata[];
  currentWorkspace: WorkspaceContext | null;
}

interface WorkspaceSwitcherProps {
  collapsed?: boolean;
  className?: string;
}

export function WorkspaceSwitcher({ collapsed = false, className = '' }: WorkspaceSwitcherProps) {
  const [loading, setLoading] = useState(false);
  const [connectionStatuses, setConnectionStatuses] = useState<
    Record<
      string,
      {
        connected: boolean;
        error?: string;
      }
    >
  >({});
  const router = useRouter();
  const { subscribe, unsubscribe } = useServerSentEvents();
  const { saveWorkspaceId, clearWorkspaceId } = useWorkspaceStorage();
  const { currentWorkspace, workspaces, setCurrentWorkspace: updateCurrentWorkspace, refreshWorkspaces } = useWorkspace();

  // Load workspaces and connection statuses on component mount
  useEffect(() => {
    if (workspaces.length > 0) {
      loadConnectionStatuses(workspaces);
    }
  }, [workspaces]);

  // Listen for workspace switch events to update UI
  useEffect(() => {
    const handleWorkspaceSwitched = (eventData: any) => {
      console.log('WorkspaceSwitcher: Received workspace-switched event', eventData);
      // Refresh workspace data to update the current workspace
      refreshWorkspaces();
    };

    subscribe('workspace-switched', handleWorkspaceSwitched);

    return () => {
      unsubscribe('workspace-switched');
    };
  }, [subscribe, unsubscribe, refreshWorkspaces]);

  const loadConnectionStatuses = async (workspaceList: WorkspaceMetadata[]) => {
    const statuses: Record<string, { connected: boolean; error?: string }> = {};

    for (const workspace of workspaceList) {
      try {
        const response = await fetch(`/api/workspaces/${workspace.id}`);
        if (response.ok) {
          const data: WorkspaceDetail = await response.json();
          statuses[workspace.id] = data.connectionStatus;
        } else {
          statuses[workspace.id] = { connected: false, error: 'Failed to check connection' };
        }
      } catch (error) {
        statuses[workspace.id] = { connected: false, error: 'Connection check failed' };
      }
    }

    setConnectionStatuses(statuses);
  };

  const getWorkspaceInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const getWorkspaceColor = (name: string) => {
    const colors = [
      '#1890ff', // blue
      '#52c41a', // green
      '#fa8c16', // orange
      '#eb2f96', // magenta
      '#722ed1', // purple
      '#13c2c2', // cyan
      '#faad14', // gold
      '#f5222d', // red
    ];

    // Generate consistent color based on workspace name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const switchWorkspace = async (workspaceId: string) => {
    try {
      // Find the workspace by ID to get its name
      const targetWorkspace = workspaces.find(ws => ws.id === workspaceId);
      if (!targetWorkspace) {
        throw new Error('Workspace not found');
      }

      // Save workspace to localStorage for persistence (client-side only)
      saveWorkspaceId(workspaceId);
      
      // Update local state immediately
      updateCurrentWorkspace({
        workspaceId,
        workspace: targetWorkspace,
        isDefault: workspaceId === 'default'
      });
      
      message.success(`Switched to workspace: ${targetWorkspace.name}`);

      // Force immediate hard reload to ensure all components refresh with new workspace context
      window.location.href = window.location.href;
    } catch (error) {
      console.error('Error switching workspace:', error);
      message.error('Failed to switch workspace');
    }
  };

  const getStorageTypeIcon = (type: string) => {
    switch (type) {
      case 'json':
        return <FileTextOutlined />;
      case 'github':
        return <GithubOutlined />;
      case 'postgres':
        return <DatabaseOutlined />;
      case 'mysql':
        return <DatabaseOutlined />;
      case 'sqlite':
        return <DatabaseOutlined />;
      default:
        return <CloudOutlined />;
    }
  };

  const renderConnectionStatus = (workspaceId: string) => {
    const status = connectionStatuses[workspaceId];
    if (!status) {
      return null;
    }

    if (status.connected) {
      return <WifiOutlined style={{ color: '#52c41a', fontSize: '12px' }} />;
    } else {
      return (
        <Tooltip title={status.error || 'Connection failed'}>
          <DisconnectOutlined style={{ color: '#ff4d4f', fontSize: '12px' }} />
        </Tooltip>
      );
    }
  };

  const avatar = (
    <Avatar
      size={20}
      style={{
        backgroundColor: currentWorkspace
          ? getWorkspaceColor(currentWorkspace.workspace.name)
          : '#d9d9d9',
        color: '#fff',
        fontSize: '10px',
        fontWeight: 600,
      }}
    >
      {currentWorkspace ? getWorkspaceInitials(currentWorkspace.workspace.name) : '?'}
    </Avatar>
  );

  // Create enhanced dropdown content
  const dropdownContent = (
    <div className={styles.workspaceDropdownContent}>
      <div className={styles.workspaceDropdownHeader}>
        <Text
          type="secondary"
          style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase' }}
        >
          WORKSPACES
        </Text>
      </div>

      <div className={styles.workspaceList}>
        {workspaces.map((workspace) => {
          const isCurrentWorkspace = currentWorkspace?.workspace.id === workspace.id;
          return (
            <div
              key={workspace.id}
              className={`${styles.workspaceItem} ${isCurrentWorkspace ? styles.workspaceItemCurrent : ''}`}
              onClick={() => !isCurrentWorkspace && switchWorkspace(workspace.id)}
            >
              <Avatar
                size={32}
                style={{
                  backgroundColor: getWorkspaceColor(workspace.name),
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {getWorkspaceInitials(workspace.name)}
              </Avatar>
              <div className={styles.workspaceItemContent}>
                <div className={styles.workspaceItemMain}>
                  <Text strong style={{ fontSize: '14px' }}>
                    {workspace.name}
                  </Text>
                  <div className={styles.workspaceItemStatus}>
                    {renderConnectionStatus(workspace.id)}
                  </div>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {workspace.id}
                </Text>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.workspaceActions}>
        <Button
          type="text"
          icon={<PlusOutlined />}
          className={styles.workspaceActionButton}
          onClick={() => router.push('/workspaces')}
        >
          Create workspace
        </Button>
        <Button
          type="text"
          icon={<SettingOutlined />}
          className={styles.workspaceActionButton}
          onClick={() => router.push('/workspaces')}
        >
          Workspace settings
        </Button>
      </div>
    </div>
  );

  return (
    <div className={collapsed ? styles.workspaceSwitcherCollapsed : styles.workspaceSwitcher}>
      <Dropdown
        popupRender={() => dropdownContent}
        placement="bottomCenter"
        trigger={['click']}
        overlayClassName={styles.workspaceDropdown}
      >
        <Button type="text" className={styles.workspaceSwitcherButton} loading={loading}>
          <Tooltip title={collapsed ? 'Switch Workspace' : undefined} placement="top">
            <div className={styles.workspaceSwitcherButtonContent}>
              {avatar}
              <div className={styles.workspaceSwitcherText}>
                <Text strong style={{ fontSize: '14px', color: '#262626' }}>
                  {currentWorkspace?.workspace.name || 'Select Workspace'}
                </Text>
              </div>
              <DownOutlined className={styles.workspaceSwitcherArrow} />
            </div>
          </Tooltip>
        </Button>
      </Dropdown>
    </div>
  );
}
