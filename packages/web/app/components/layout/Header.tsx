'use client';

import React from 'react';
import { Badge, Button, Layout, Space, Typography } from 'antd';
import { MenuOutlined, WifiOutlined } from '@ant-design/icons';
import styles from './Header.module.css';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

interface HeaderProps {
  connected: boolean;
  sidebarCollapsed?: boolean;
  onSidebarToggle?: () => void;
}

export function Header({ connected, sidebarCollapsed, onSidebarToggle }: HeaderProps) {
  return (
    <AntHeader className={styles.headerContainer}>
      <div className={styles.headerLeft}>
        {onSidebarToggle && (
          <Button type="text" icon={<MenuOutlined />} onClick={onSidebarToggle} />
        )}
        <Typography.Title level={3} className={styles.headerTitle}>
          Dashboard
        </Typography.Title>
      </div>

      <Space size="middle">
        <Space size="small">
          <Badge
            status={connected ? 'success' : 'error'}
            text={
              <Text type={connected ? 'success' : 'danger'}>
                {connected ? 'Connected' : 'Disconnected'}
              </Text>
            }
          />
          <WifiOutlined style={{ color: connected ? '#52c41a' : '#ff4d4f' }} />
        </Space>
      </Space>
    </AntHeader>
  );
}
