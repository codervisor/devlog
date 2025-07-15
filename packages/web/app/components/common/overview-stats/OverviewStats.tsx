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
import { DevlogStats, DevlogStatus, DevlogFilter } from '@devlog/core';
import styles from './OverviewStats.module.css';

const { Title } = Typography;

export type OverviewStatsVariant = 'detailed' | 'icon';

interface OverviewStatsProps {
  stats: DevlogStats | null;
  variant?: OverviewStatsVariant;
  title?: string;
  className?: string;
  currentFilters?: DevlogFilter;
  onFilterToggle?: (status: DevlogStatus | 'total') => void;
}

export function OverviewStats({
  stats,
  variant = 'detailed',
  title,
  className,
  currentFilters,
  onFilterToggle,
}: OverviewStatsProps) {
  if (!stats) {
    return null;
  }

  const isStatusActive = (status: DevlogStatus) => {
    return currentFilters?.status?.includes(status) || false;
  };

  const isTotalActive = () => {
    return !currentFilters?.status || currentFilters.status.length === 0;
  };

  const handleStatClick = (status: DevlogStatus | 'total') => {
    if (onFilterToggle) {
      onFilterToggle(status);
    }
  };

  const getStatClasses = (status: DevlogStatus | 'total', baseClasses: string) => {
    const isActive = status === 'total' ? isTotalActive() : isStatusActive(status as DevlogStatus);
    const isClickable = onFilterToggle !== undefined;
    
    return `${baseClasses} ${isClickable ? styles.clickableStat : ''} ${isActive ? styles.activeStat : ''}`;
  };

  // Render detailed variant (for Dashboard and List page)
  if (variant === 'detailed') {
    return (
      <div className={`${styles.dashboardStats} ${className || ''}`}>
        <div 
          className={getStatClasses('total', styles.statCompact)}
          onClick={() => handleStatClick('total')}
          title={onFilterToggle ? (isTotalActive() ? "Clear filters" : "Show all") : undefined}
        >
          <span className={styles.statValue}>{stats.totalEntries}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
        <div 
          className={getStatClasses('new', styles.statCompact)}
          onClick={() => handleStatClick('new')}
          title={onFilterToggle ? (isStatusActive('new') ? "Clear filter" : "Filter by New") : undefined}
        >
          <span className={`${styles.statValue} ${styles.new}`}>
            {stats.byStatus['new'] || 0}
          </span>
          <span className={styles.statLabel}>New</span>
        </div>
        <div 
          className={getStatClasses('in-progress', styles.statCompact)}
          onClick={() => handleStatClick('in-progress')}
          title={onFilterToggle ? (isStatusActive('in-progress') ? "Clear filter" : "Filter by In Progress") : undefined}
        >
          <span className={`${styles.statValue} ${styles.inProgress}`}>
            {stats.byStatus['in-progress'] || 0}
          </span>
          <span className={styles.statLabel}>In Progress</span>
        </div>
        <div 
          className={getStatClasses('blocked', styles.statCompact)}
          onClick={() => handleStatClick('blocked')}
          title={onFilterToggle ? (isStatusActive('blocked') ? "Clear filter" : "Filter by Blocked") : undefined}
        >
          <span className={`${styles.statValue} ${styles.blocked}`}>
            {stats.byStatus['blocked'] || 0}
          </span>
          <span className={styles.statLabel}>Blocked</span>
        </div>
        <div 
          className={getStatClasses('in-review', styles.statCompact)}
          onClick={() => handleStatClick('in-review')}
          title={onFilterToggle ? (isStatusActive('in-review') ? "Clear filter" : "Filter by In Review") : undefined}
        >
          <span className={`${styles.statValue} ${styles.inReview}`}>
            {stats.byStatus['in-review'] || 0}
          </span>
          <span className={styles.statLabel}>In Review</span>
        </div>
        <div 
          className={getStatClasses('testing', styles.statCompact)}
          onClick={() => handleStatClick('testing')}
          title={onFilterToggle ? (isStatusActive('testing') ? "Clear filter" : "Filter by Testing") : undefined}
        >
          <span className={`${styles.statValue} ${styles.testing}`}>
            {stats.byStatus['testing'] || 0}
          </span>
          <span className={styles.statLabel}>Testing</span>
        </div>
        <div 
          className={getStatClasses('done', styles.statCompact)}
          onClick={() => handleStatClick('done')}
          title={onFilterToggle ? (isStatusActive('done') ? "Clear filter" : "Filter by Done") : undefined}
        >
          <span className={`${styles.statValue} ${styles.completed}`}>
            {stats.byStatus['done'] || 0}
          </span>
          <span className={styles.statLabel}>Done</span>
        </div>
        <div 
          className={getStatClasses('closed', styles.statCompact)}
          onClick={() => handleStatClick('closed')}
          title={onFilterToggle ? (isStatusActive('closed') ? "Clear filter" : "Filter by Closed") : undefined}
        >
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
