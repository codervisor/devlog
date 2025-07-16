'use client';

import React, { useState, useEffect } from 'react';
import {
  InfoCircleOutlined,
  NumberOutlined,
  PlusCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Popover, Typography, Tooltip, Button, Skeleton } from 'antd';
import { DevlogStats, DevlogStatus, DevlogFilter, FilterType } from '@devlog/core';
import styles from './OverviewStats.module.css';

const { Title } = Typography;

export type OverviewStatsVariant = 'detailed' | 'icon';

interface OverviewStatsProps {
  stats: DevlogStats | null;
  variant?: OverviewStatsVariant;
  title?: string;
  className?: string;
  currentFilters?: DevlogFilter;
  onFilterToggle?: (status: FilterType) => void;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  loading?: boolean;
}

export function OverviewStats({
  stats,
  variant = 'detailed',
  title,
  className,
  currentFilters,
  onFilterToggle,
  collapsible = false,
  defaultCollapsed = false,
  loading = false,
}: OverviewStatsProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    if (collapsible) {
      const savedState = localStorage.getItem('overviewStats.collapsed');
      if (savedState !== null) {
        setIsCollapsed(JSON.parse(savedState));
      }
    }
  }, [collapsible]);

  // Save collapsed state to localStorage
  useEffect(() => {
    if (collapsible) {
      localStorage.setItem('overviewStats.collapsed', JSON.stringify(isCollapsed));
    }
  }, [isCollapsed, collapsible]);

  // Render skeleton loading state
  const renderSkeleton = () => {
    if (variant === 'icon') {
      return (
        <Skeleton.Button
          style={{
            width: '16px',
            height: '16px',
            minWidth: '16px',
          }}
          active
          size="small"
        />
      );
    }

    // For detailed variant
    if (collapsible && isCollapsed) {
      // Skeleton for collapsed view
      return (
        <div className={`${styles.dashboardStats} ${styles.collapsedStats} ${className || ''}`}>
          <div className={`${styles.statCompact} ${styles.collapsedSummary}`}>
            <Skeleton.Button style={{ width: '60px', height: '56px' }} active size="small" />
          </div>
          <Skeleton.Button style={{ width: '24px', height: '24px' }} active size="small" />
        </div>
      );
    }

    // Skeleton for expanded detailed view
    return (
      <div className={`${styles.dashboardStats} ${className || ''}`}>
        {/* Total stat skeleton */}
        <div className={styles.statCompact}>
          <Skeleton.Button style={{ width: '60px', height: '56px' }} active size="small" />
        </div>
        {/* Status stats skeleton */}
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className={styles.statCompact}>
            <Skeleton.Button style={{ width: '60px', height: '56px' }} active size="small" />
          </div>
        ))}
        {collapsible && (
          <Skeleton.Button
            style={{ width: '32px', height: '32px', minWidth: '32px', padding: '4px 8px' }}
            active
            size="small"
          />
        )}
      </div>
    );
  };

  // Show skeleton when loading
  if (loading) {
    return renderSkeleton();
  }

  if (!stats) {
    return null;
  }

  const isStatusActive = (status: DevlogStatus) => {
    return currentFilters?.status?.includes(status) || false;
  };

  const isTotalActive = () => {
    return !currentFilters?.status || currentFilters.status.length === 0;
  };

  const handleStatClick = (status: FilterType) => {
    if (onFilterToggle) {
      onFilterToggle(status);
    }
  };

  const getStatClasses = (status: FilterType, baseClasses: string) => {
    const isActive = status === 'total' ? isTotalActive() : isStatusActive(status as DevlogStatus);
    const isClickable = onFilterToggle !== undefined;

    return `${baseClasses} ${isClickable ? styles.clickableStat : ''} ${isActive ? styles.activeStat : ''}`;
  };

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Helper to get active status counts for collapsed view
  const getActiveStatusCount = () => {
    if (!currentFilters?.status || currentFilters.status.length === 0) {
      return stats!.totalEntries;
    }
    return currentFilters.status.reduce((total, status) => {
      return total + (stats!.byStatus[status] || 0);
    }, 0);
  };

  // Helper to get active status labels for collapsed view
  const getActiveStatusLabels = () => {
    if (!currentFilters?.status || currentFilters.status.length === 0) {
      return 'Total';
    }
    if (currentFilters.status.length === 1) {
      return currentFilters.status[0].charAt(0).toUpperCase() + currentFilters.status[0].slice(1);
    }
    return `${currentFilters.status.length} filters`;
  };

  // Helper to get primary active status for styling
  const getPrimaryActiveStatus = (): FilterType => {
    if (!currentFilters?.status || currentFilters.status.length === 0) {
      return 'total';
    }
    // Return the first status if only one is active, or 'total' if multiple
    if (currentFilters.status.length === 1) {
      return currentFilters.status[0];
    }
    return 'total';
  };

  // Render collapsed view for detailed variant
  const renderCollapsedView = () => {
    const activeCount = getActiveStatusCount();
    const activeLabel = getActiveStatusLabels();
    const primaryStatus = getPrimaryActiveStatus();

    // Get the appropriate CSS class for the primary status
    const getStatusClass = (status: FilterType) => {
      switch (status) {
        case 'new':
          return styles.new;
        case 'in-progress':
          return styles.inProgress;
        case 'blocked':
          return styles.blocked;
        case 'in-review':
          return styles.inReview;
        case 'testing':
          return styles.testing;
        case 'done':
          return styles.completed;
        case 'cancelled':
          return styles.closed;
        default:
          return ''; // 'total', 'open', 'closed' - no specific class
      }
    };

    return (
      <div className={`${styles.dashboardStats} ${styles.collapsedStats} ${className || ''}`}>
        <div className={`${styles.statCompact} ${styles.collapsedSummary}`}>
          <span className={`${styles.statValue} ${getStatusClass(primaryStatus)}`}>
            {activeCount}
          </span>
          <span className={styles.statLabel}>{activeLabel}</span>
        </div>
        <Button
          type="text"
          size="small"
          icon={<LeftOutlined />}
          onClick={toggleCollapsed}
          className={styles.collapseButton}
          title="Expand stats"
        />
      </div>
    );
  };

  // Render detailed variant (for Dashboard and List page)
  if (variant === 'detailed') {
    // Return collapsed view if collapsible and collapsed
    if (collapsible && isCollapsed) {
      return renderCollapsedView();
    }

    // Render simplified view with only primary aggregates and dropdown for details
    return (
      <div className={`${styles.dashboardStats} ${className || ''}`}>
        <div
          className={getStatClasses('total', styles.statCompact)}
          onClick={() => handleStatClick('total')}
          title={onFilterToggle ? (isTotalActive() ? 'Clear filters' : 'Show all') : undefined}
        >
          <span className={styles.statValue}>{stats.totalEntries}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
        
        <Popover
          content={
            <div className={styles.popoverContent}>
              <div className={styles.popoverStats}>
                <div className={styles.statCompact}>
                  <span className={`${styles.statValue} ${styles.new}`}>{stats.byStatus['new'] || 0}</span>
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
              </div>
            </div>
          }
          title="Open Status Breakdown"
          trigger={onFilterToggle ? "click" : "hover"}
          placement="bottom"
        >
          <div
            className={getStatClasses('open', styles.statCompact)}
            onClick={() => handleStatClick('open')}
            title={onFilterToggle ? 'Show open entries' : undefined}
          >
            <span className={`${styles.statValue} ${styles.inProgress}`}>{stats.openEntries}</span>
            <span className={styles.statLabel}>Open</span>
          </div>
        </Popover>
        
        <Popover
          content={
            <div className={styles.popoverContent}>
              <div className={styles.popoverStats}>
                <div className={styles.statCompact}>
                  <span className={`${styles.statValue} ${styles.completed}`}>
                    {stats.byStatus['done'] || 0}
                  </span>
                  <span className={styles.statLabel}>Done</span>
                </div>
                <div className={styles.statCompact}>
                  <span className={`${styles.statValue} ${styles.closed}`}>
                    {stats.byStatus['cancelled'] || 0}
                  </span>
                  <span className={styles.statLabel}>Cancelled</span>
                </div>
              </div>
            </div>
          }
          title="Closed Status Breakdown"
          trigger={onFilterToggle ? "click" : "hover"}
          placement="bottom"
        >
          <div
            className={getStatClasses('closed', styles.statCompact)}
            onClick={() => handleStatClick('closed')}
            title={onFilterToggle ? 'Show closed entries' : undefined}
          >
            <span className={`${styles.statValue} ${styles.closed}`}>{stats.closedEntries}</span>
            <span className={styles.statLabel}>Closed</span>
          </div>
        </Popover>
        
        {collapsible && (
          <Button
            type="text"
            size="small"
            icon={<RightOutlined />}
            onClick={toggleCollapsed}
            className={styles.collapseButton}
            title="Collapse stats"
          />
        )}
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
          <span className={`${styles.statValue} ${styles.new}`}>{stats.byStatus['new'] || 0}</span>
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
            {stats.byStatus['cancelled'] || 0}
          </span>
          <span className={styles.statLabel}>Cancelled</span>
        </div>
      </div>
    </div>
  );

  // Render icon variant (for footer)
  if (variant === 'icon') {
    return (
      <Popover content={detailedContent} title="Quick Stats" trigger="hover" placement="top">
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
