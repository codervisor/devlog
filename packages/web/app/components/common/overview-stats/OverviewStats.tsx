'use client';

import React from 'react';
import { BarChartOutlined } from '@ant-design/icons';
import { Popover, Skeleton } from 'antd';
import { DevlogFilter, DevlogStats, DevlogStatus, FilterType } from '@devlog/core';
import styles from './OverviewStats.module.css';

export type OverviewStatsVariant = 'detailed' | 'icon';

interface OverviewStatsProps {
  stats: DevlogStats | null;
  variant?: OverviewStatsVariant;
  className?: string;
  currentFilters?: DevlogFilter;
  onFilterToggle?: (status: FilterType) => void;
  loading?: boolean;
}

export function OverviewStats({
  stats,
  variant = 'detailed',
  className,
  currentFilters,
  onFilterToggle,
  loading = false,
}: OverviewStatsProps) {
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

    // Skeleton for detailed view
    return (
      <div className={`${styles.dashboardStats} ${className || ''}`}>
        {/* Total stat skeleton */}
        <div className={styles.statCompact}>
          <Skeleton.Button style={{ width: '64px', height: '56px' }} active size="small" />
        </div>
        {/* Status stats skeleton */}
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className={styles.statCompact}>
            <Skeleton.Button style={{ width: '64px', height: '56px' }} active size="small" />
          </div>
        ))}
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
    return !!currentFilters?.status?.includes(status);
  };

  const isTotalActive = () => {
    // Total is active when no filterType and no specific status filters
    return (
      (!currentFilters?.filterType || currentFilters.filterType === 'total') &&
      (!currentFilters?.status || currentFilters.status.length === 0)
    );
  };

  const isOpenActive = () => {
    // Open is active when filterType is 'open'
    return currentFilters?.filterType === 'open';
  };

  const isClosedActive = () => {
    // Closed is active when filterType is 'closed'
    return currentFilters?.filterType === 'closed';
  };

  const handleStatClick = (status: FilterType) => {
    if (onFilterToggle) {
      onFilterToggle(status);
    }
  };

  const getStatClasses = (status: FilterType, baseClasses: string, isSubStatus = false) => {
    let isActive: boolean;
    if (status === 'total') {
      isActive = isTotalActive();
    } else if (status === 'open') {
      isActive = isOpenActive();
    } else if (status === 'closed') {
      isActive = isClosedActive();
    } else {
      // Use status logic for individual statuses to avoid highlighting when parent is active
      if (!isSubStatus) {
        throw new Error('isSubStatus must be true for individual statuses');
      }
      isActive = isStatusActive(status);
    }

    const isClickable = onFilterToggle !== undefined;

    return `${baseClasses} ${isClickable ? styles.clickableStat : ''} ${isActive ? styles.activeStat : ''}`;
  };

  // Render detailed variant (for Dashboard and List page)
  if (variant === 'detailed') {
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
                <div
                  className={getStatClasses('new', styles.statCompact, true)}
                  onClick={() => handleStatClick('new')}
                  title={onFilterToggle ? 'Filter by New' : undefined}
                >
                  <span className={`${styles.statValue} ${styles.new}`}>
                    {stats.byStatus['new'] || 0}
                  </span>
                  <span className={styles.statLabel}>New</span>
                </div>
                <div
                  className={getStatClasses('in-progress', styles.statCompact, true)}
                  onClick={() => handleStatClick('in-progress')}
                  title={onFilterToggle ? 'Filter by In Progress' : undefined}
                >
                  <span className={`${styles.statValue} ${styles.inProgress}`}>
                    {stats.byStatus['in-progress'] || 0}
                  </span>
                  <span className={styles.statLabel}>In Progress</span>
                </div>
                <div
                  className={getStatClasses('blocked', styles.statCompact, true)}
                  onClick={() => handleStatClick('blocked')}
                  title={onFilterToggle ? 'Filter by Blocked' : undefined}
                >
                  <span className={`${styles.statValue} ${styles.blocked}`}>
                    {stats.byStatus['blocked'] || 0}
                  </span>
                  <span className={styles.statLabel}>Blocked</span>
                </div>
                <div
                  className={getStatClasses('in-review', styles.statCompact, true)}
                  onClick={() => handleStatClick('in-review')}
                  title={onFilterToggle ? 'Filter by In Review' : undefined}
                >
                  <span className={`${styles.statValue} ${styles.inReview}`}>
                    {stats.byStatus['in-review'] || 0}
                  </span>
                  <span className={styles.statLabel}>In Review</span>
                </div>
                <div
                  className={getStatClasses('testing', styles.statCompact, true)}
                  onClick={() => handleStatClick('testing')}
                  title={onFilterToggle ? 'Filter by Testing' : undefined}
                >
                  <span className={`${styles.statValue} ${styles.testing}`}>
                    {stats.byStatus['testing'] || 0}
                  </span>
                  <span className={styles.statLabel}>Testing</span>
                </div>
              </div>
            </div>
          }
          title="Open Status Breakdown"
          trigger="hover"
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
                <div
                  className={getStatClasses('done', styles.statCompact, true)}
                  onClick={() => handleStatClick('done')}
                  title={onFilterToggle ? 'Filter by Done' : undefined}
                >
                  <span className={`${styles.statValue} ${styles.completed}`}>
                    {stats.byStatus['done'] || 0}
                  </span>
                  <span className={styles.statLabel}>Done</span>
                </div>
                <div
                  className={getStatClasses('cancelled', styles.statCompact, true)}
                  onClick={() => handleStatClick('cancelled')}
                  title={onFilterToggle ? 'Filter by Cancelled' : undefined}
                >
                  <span className={`${styles.statValue} ${styles.closed}`}>
                    {stats.byStatus['cancelled'] || 0}
                  </span>
                  <span className={styles.statLabel}>Cancelled</span>
                </div>
              </div>
            </div>
          }
          title="Closed Status Breakdown"
          trigger="hover"
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
      </div>
    );
  }

  // Create detailed stats content for popover
  const detailedContent = (
    <div className={styles.popoverContent}>
      <div className={styles.popoverStats}>
        <div
          className={getStatClasses('total', styles.statCompact)}
          onClick={() => handleStatClick('total')}
          title={onFilterToggle ? 'Show all entries' : undefined}
        >
          <span className={styles.statValue}>{stats.totalEntries}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
        <div
          className={getStatClasses('new', styles.statCompact, true)}
          onClick={() => handleStatClick('new')}
          title={onFilterToggle ? 'Filter by New' : undefined}
        >
          <span className={`${styles.statValue} ${styles.new}`}>{stats.byStatus['new'] || 0}</span>
          <span className={styles.statLabel}>New</span>
        </div>
        <div
          className={getStatClasses('in-progress', styles.statCompact, true)}
          onClick={() => handleStatClick('in-progress')}
          title={onFilterToggle ? 'Filter by In Progress' : undefined}
        >
          <span className={`${styles.statValue} ${styles.inProgress}`}>
            {stats.byStatus['in-progress'] || 0}
          </span>
          <span className={styles.statLabel}>In Progress</span>
        </div>
        <div
          className={getStatClasses('blocked', styles.statCompact, true)}
          onClick={() => handleStatClick('blocked')}
          title={onFilterToggle ? 'Filter by Blocked' : undefined}
        >
          <span className={`${styles.statValue} ${styles.blocked}`}>
            {stats.byStatus['blocked'] || 0}
          </span>
          <span className={styles.statLabel}>Blocked</span>
        </div>
        <div
          className={getStatClasses('in-review', styles.statCompact, true)}
          onClick={() => handleStatClick('in-review')}
          title={onFilterToggle ? 'Filter by In Review' : undefined}
        >
          <span className={`${styles.statValue} ${styles.inReview}`}>
            {stats.byStatus['in-review'] || 0}
          </span>
          <span className={styles.statLabel}>In Review</span>
        </div>
        <div
          className={getStatClasses('testing', styles.statCompact, true)}
          onClick={() => handleStatClick('testing')}
          title={onFilterToggle ? 'Filter by Testing' : undefined}
        >
          <span className={`${styles.statValue} ${styles.testing}`}>
            {stats.byStatus['testing'] || 0}
          </span>
          <span className={styles.statLabel}>Testing</span>
        </div>
        <div
          className={getStatClasses('done', styles.statCompact, true)}
          onClick={() => handleStatClick('done')}
          title={onFilterToggle ? 'Filter by Done' : undefined}
        >
          <span className={`${styles.statValue} ${styles.completed}`}>
            {stats.byStatus['done'] || 0}
          </span>
          <span className={styles.statLabel}>Done</span>
        </div>
        <div
          className={getStatClasses('cancelled', styles.statCompact, true)}
          onClick={() => handleStatClick('cancelled')}
          title={onFilterToggle ? 'Filter by Cancelled' : undefined}
        >
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
