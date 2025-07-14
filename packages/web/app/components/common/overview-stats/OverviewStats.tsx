'use client';

import React from 'react';
import { 
  InfoCircleOutlined, 
  NumberOutlined, 
  PlusCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  BarChartOutlined 
} from '@ant-design/icons';
import { Popover, Typography, Tooltip } from 'antd';
import { DevlogStats } from '@devlog/types';
import styles from './OverviewStats.module.css';

const { Title } = Typography;

export type OverviewStatsVariant = 'detailed' | 'compact' | 'icon';

interface OverviewStatsProps {
  stats: DevlogStats | null;
  variant?: OverviewStatsVariant;
  title?: string;
  className?: string;
}

export function OverviewStats({
  stats,
  variant = 'detailed',
  title,
  className,
}: OverviewStatsProps) {
  if (!stats) {
    return null;
  }

  // Render detailed variant (for Dashboard)
  if (variant === 'detailed') {
    return (
      <div className={`${styles.dashboardStats} ${className || ''}`}>
        <div className={styles.statCompact}>
          <span className={styles.statValue}>{stats.totalEntries}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
        <div className={styles.statCompact}>
          <span className={`${styles.statValue} ${styles.new}`}>
            {stats.byStatus['new'] || 0}
          </span>
          <span className={styles.statLabel}>New</span>
        </div>
        <div className={styles.statCompact}>
          <span className={`${styles.statValue} ${styles.inProgress}`}>
            {stats.byStatus['in-progress'] || 0}
          </span>
          <span className={styles.statLabel}>In Progress</span>
        </div>
        <div className={styles.statCompact}>
          <span className={`${styles.statValue} ${styles.blocked}`}>
            {stats.byStatus['blocked'] || 0}
          </span>
          <span className={styles.statLabel}>Blocked</span>
        </div>
        <div className={styles.statCompact}>
          <span className={`${styles.statValue} ${styles.inReview}`}>
            {stats.byStatus['in-review'] || 0}
          </span>
          <span className={styles.statLabel}>In Review</span>
        </div>
        <div className={styles.statCompact}>
          <span className={`${styles.statValue} ${styles.testing}`}>
            {stats.byStatus['testing'] || 0}
          </span>
          <span className={styles.statLabel}>Testing</span>
        </div>
        <div className={styles.statCompact}>
          <span className={`${styles.statValue} ${styles.completed}`}>
            {stats.byStatus['done'] || 0}
          </span>
          <span className={styles.statLabel}>Done</span>
        </div>
        <div className={styles.statCompact}>
          <span className={`${styles.statValue} ${styles.closed}`}>
            {stats.byStatus['closed'] || 0}
          </span>
          <span className={styles.statLabel}>Closed</span>
        </div>
      </div>
    );
  }

  // Create detailed stats content for popover
  const detailedContent = (
    <div className={styles.popoverContent}>
      <div className={styles.popoverStats}>
        <div className={styles.statCompact}>
          <span className={styles.statValue}>{stats.totalEntries}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
        <div className={styles.statCompact}>
          <span className={`${styles.statValue} ${styles.new}`}>
            {stats.byStatus['new'] || 0}
          </span>
          <span className={styles.statLabel}>New</span>
        </div>
        <div className={styles.statCompact}>
          <span className={`${styles.statValue} ${styles.inProgress}`}>
            {stats.byStatus['in-progress'] || 0}
          </span>
          <span className={styles.statLabel}>In Progress</span>
        </div>
        <div className={styles.statCompact}>
          <span className={`${styles.statValue} ${styles.blocked}`}>
            {stats.byStatus['blocked'] || 0}
          </span>
          <span className={styles.statLabel}>Blocked</span>
        </div>
        <div className={styles.statCompact}>
          <span className={`${styles.statValue} ${styles.inReview}`}>
            {stats.byStatus['in-review'] || 0}
          </span>
          <span className={styles.statLabel}>In Review</span>
        </div>
        <div className={styles.statCompact}>
          <span className={`${styles.statValue} ${styles.testing}`}>
            {stats.byStatus['testing'] || 0}
          </span>
          <span className={styles.statLabel}>Testing</span>
        </div>
        <div className={styles.statCompact}>
          <span className={`${styles.statValue} ${styles.completed}`}>
            {stats.byStatus['done'] || 0}
          </span>
          <span className={styles.statLabel}>Done</span>
        </div>
        <div className={styles.statCompact}>
          <span className={`${styles.statValue} ${styles.closed}`}>
            {stats.byStatus['closed'] || 0}
          </span>
          <span className={styles.statLabel}>Closed</span>
        </div>
      </div>
    </div>
  );

  // Render compact variant (for NavigationSidebar)
  if (variant === 'compact') {
    return (
      <div className={`${styles.sidebarStats} ${className || ''}`}>
        {title && (
          <div className={styles.sidebarStatsHeader}>
            <Title level={5} className={styles.sidebarStatsTitle}>
              {title}
            </Title>
            <Popover
              content={detailedContent}
              title="Detailed Statistics"
              trigger="hover"
              placement="rightTop"
            >
              <InfoCircleOutlined className={styles.infoIcon} />
            </Popover>
          </div>
        )}
        <div className={styles.compactStats}>
          <Tooltip title="Total">
            <div className={styles.statCompact}>
              <NumberOutlined className={`${styles.statIcon} ${styles.statValue}`} />
              <span className={styles.statValue}>{stats.totalEntries}</span>
            </div>
          </Tooltip>
          <Tooltip title="New">
            <div className={styles.statCompact}>
              <PlusCircleOutlined className={`${styles.statIcon} ${styles.statValue} ${styles.new}`} />
              <span className={`${styles.statValue} ${styles.new}`}>
                {stats.byStatus['new'] || 0}
              </span>
            </div>
          </Tooltip>
          <Tooltip title="In Progress">
            <div className={styles.statCompact}>
              <ClockCircleOutlined className={`${styles.statIcon} ${styles.statValue} ${styles.inProgress}`} />
              <span className={`${styles.statValue} ${styles.inProgress}`}>
                {stats.byStatus['in-progress'] || 0}
              </span>
            </div>
          </Tooltip>
          <Tooltip title="Done">
            <div className={styles.statCompact}>
              <CheckCircleOutlined className={`${styles.statIcon} ${styles.statValue} ${styles.completed}`} />
              <span className={`${styles.statValue} ${styles.completed}`}>
                {stats.byStatus['done'] || 0}
              </span>
            </div>
          </Tooltip>
        </div>
      </div>
    );
  }

  // Render icon variant (for footer)
  if (variant === 'icon') {
    return (
      <Popover
        content={detailedContent}
        title="Quick Stats"
        trigger="hover"
        placement="top"
      >
        <BarChartOutlined
          style={{
            color: '#8c8c8c',
            fontSize: '16px',
            cursor: 'default',
          }}
        />
      </Popover>
    );
  }

  return null;
}
