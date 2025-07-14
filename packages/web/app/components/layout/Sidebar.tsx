'use client';

import React from 'react';
import { Card, Col, Layout, Menu, Row, Statistic, Typography } from 'antd';
import { DashboardOutlined, FileTextOutlined, PlusOutlined } from '@ant-design/icons';
import Image from 'next/image';
import styles from './Sidebar.module.css';

const { Sider } = Layout;
const { Title, Text } = Typography;

interface SidebarProps {
  currentView: string;
  onViewChange: (view: any, devlog?: any) => void;
  stats: any;
  collapsed?: boolean;
}

export function Sidebar({ currentView, onViewChange, stats, collapsed = false }: SidebarProps) {
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

  return (
    <Sider
      width={280}
      collapsed={collapsed}
      collapsedWidth={0}
      breakpoint="md"
      style={{
        background: '#fff',
        borderRight: '1px solid #f0f0f0',
      }}
    >
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarBrand}>
          <Image 
            src="/devlog-logo.svg" 
            alt="Devlog Logo" 
            width={24} 
            height={24} 
            className={styles.sidebarBrandIcon}
          />
          <Title level={3} className={styles.sidebarBrandTitle}>
            Devlog
          </Title>
        </div>
        <Text type="secondary">Development Tracker</Text>
      </div>

      <Menu
        mode="inline"
        selectedKeys={[currentView]}
        style={{ borderRight: 0 }}
        items={menuItems}
        onClick={({ key }) => onViewChange(key)}
      />

      {stats && (
        <div className={styles.sidebarStats}>
          <Title level={5} className={styles.sidebarStatsTitle}>
            QUICK STATS
          </Title>
          <Card size="small" className={styles.sidebarStatsCard}>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Statistic
                  title="Total"
                  value={stats.totalEntries || 0}
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="In Progress"
                  value={stats.byStatus?.['in-progress'] || 0}
                  valueStyle={{ fontSize: '14px', color: '#1890ff' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Completed"
                  value={stats.byStatus?.done || 0}
                  valueStyle={{ fontSize: '14px', color: '#52c41a' }}
                />
              </Col>
            </Row>
          </Card>
        </div>
      )}
    </Sider>
  );
}
