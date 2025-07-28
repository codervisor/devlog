'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { DevlogFilter, DevlogStats, DevlogStatus, FilterType } from '@codervisor/devlog-core';
import { cn } from '@/lib/utils';

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
      return <Skeleton className="w-4 h-4" />;
    }

    return (
      <div className={cn("flex gap-4", className)}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex flex-col items-center justify-center min-w-16 p-2">
            <Skeleton className="w-8 h-6 mb-1" />
            <Skeleton className="w-12 h-4" />
          </div>
        ))}
      </div>
    );
  };

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
    return (
      (!currentFilters?.filterType || currentFilters.filterType === 'total') &&
      (!currentFilters?.status || currentFilters.status.length === 0)
    );
  };

  const isOpenActive = () => {
    return currentFilters?.filterType === 'open';
  };

  const isClosedActive = () => {
    return currentFilters?.filterType === 'closed';
  };

  const handleStatClick = (status: FilterType) => {
    if (onFilterToggle) {
      onFilterToggle(status);
    }
  };

  const getStatClasses = (filterType: FilterType, isIndividualStatus = false) => {
    let isActive: boolean;
    if (filterType === 'total') {
      isActive = isTotalActive();
    } else if (filterType === 'open') {
      isActive = isOpenActive();
    } else if (filterType === 'closed') {
      isActive = isClosedActive();
    } else {
      isActive = isStatusActive(filterType as DevlogStatus);
    }

    const isClickable = onFilterToggle !== undefined;

    return cn(
      "flex flex-col items-center justify-center min-w-16 p-2 rounded-md transition-colors",
      {
        "cursor-pointer hover:bg-muted/50": isClickable,
        "bg-primary/10 text-primary border border-primary/20": isActive,
        "hover:bg-muted": isClickable && !isActive,
      }
    );
  };

  const getStatusColor = (status: DevlogStatus) => {
    const colors = {
      'new': 'text-blue-600',
      'in-progress': 'text-orange-600',
      'blocked': 'text-red-600',
      'in-review': 'text-purple-600',
      'testing': 'text-yellow-600',
      'done': 'text-green-600',
      'cancelled': 'text-gray-600',
    };
    return colors[status] || 'text-foreground';
  };

  const StatItem = ({ 
    value, 
    label, 
    onClick, 
    className: itemClassName, 
    status 
  }: { 
    value: number; 
    label: string; 
    onClick?: () => void; 
    className?: string;
    status?: DevlogStatus;
  }) => (
    <div className={itemClassName} onClick={onClick}>
      <span className={cn(
        "text-2xl font-semibold",
        status && getStatusColor(status)
      )}>
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );

  if (variant === 'detailed') {
    return (
      <div className={cn("flex gap-4", className)}>
        <StatItem
          value={stats.totalEntries}
          label="Total"
          onClick={() => handleStatClick('total')}
          className={getStatClasses('total')}
        />

        <Popover>
          <PopoverTrigger asChild>
            <div className={getStatClasses('open')}>
              <StatItem
                value={stats.openEntries}
                label="Open"
                onClick={() => handleStatClick('open')}
                className="w-full"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Open Status Breakdown</h4>
              <div className="grid grid-cols-3 gap-2">
                <StatItem
                  value={stats.byStatus['new'] || 0}
                  label="New"
                  onClick={() => handleStatClick('new')}
                  className={getStatClasses('new', true)}
                  status="new"
                />
                <StatItem
                  value={stats.byStatus['in-progress'] || 0}
                  label="In Progress"
                  onClick={() => handleStatClick('in-progress')}
                  className={getStatClasses('in-progress', true)}
                  status="in-progress"
                />
                <StatItem
                  value={stats.byStatus['blocked'] || 0}
                  label="Blocked"
                  onClick={() => handleStatClick('blocked')}
                  className={getStatClasses('blocked', true)}
                  status="blocked"
                />
                <StatItem
                  value={stats.byStatus['in-review'] || 0}
                  label="In Review"
                  onClick={() => handleStatClick('in-review')}
                  className={getStatClasses('in-review', true)}
                  status="in-review"
                />
                <StatItem
                  value={stats.byStatus['testing'] || 0}
                  label="Testing"
                  onClick={() => handleStatClick('testing')}
                  className={getStatClasses('testing', true)}
                  status="testing"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <div className={getStatClasses('closed')}>
              <StatItem
                value={stats.closedEntries}
                label="Closed"
                onClick={() => handleStatClick('closed')}
                className="w-full"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-60">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Closed Status Breakdown</h4>
              <div className="grid grid-cols-2 gap-2">
                <StatItem
                  value={stats.byStatus['done'] || 0}
                  label="Done"
                  onClick={() => handleStatClick('done')}
                  className={getStatClasses('done', true)}
                  status="done"
                />
                <StatItem
                  value={stats.byStatus['cancelled'] || 0}
                  label="Cancelled"
                  onClick={() => handleStatClick('cancelled')}
                  className={getStatClasses('cancelled', true)}
                  status="cancelled"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  if (variant === 'icon') {
    const detailedContent = (
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          <StatItem
            value={stats.totalEntries}
            label="Total"
            onClick={() => handleStatClick('total')}
            className={getStatClasses('total')}
          />
          <StatItem
            value={stats.byStatus['new'] || 0}
            label="New"
            onClick={() => handleStatClick('new')}
            className={getStatClasses('new', true)}
            status="new"
          />
          <StatItem
            value={stats.byStatus['in-progress'] || 0}
            label="In Progress"
            onClick={() => handleStatClick('in-progress')}
            className={getStatClasses('in-progress', true)}
            status="in-progress"
          />
          <StatItem
            value={stats.byStatus['blocked'] || 0}
            label="Blocked"
            onClick={() => handleStatClick('blocked')}
            className={getStatClasses('blocked', true)}
            status="blocked"
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <StatItem
            value={stats.byStatus['in-review'] || 0}
            label="In Review"
            onClick={() => handleStatClick('in-review')}
            className={getStatClasses('in-review', true)}
            status="in-review"
          />
          <StatItem
            value={stats.byStatus['testing'] || 0}
            label="Testing"
            onClick={() => handleStatClick('testing')}
            className={getStatClasses('testing', true)}
            status="testing"
          />
          <StatItem
            value={stats.byStatus['done'] || 0}
            label="Done"
            onClick={() => handleStatClick('done')}
            className={getStatClasses('done', true)}
            status="done"
          />
          <StatItem
            value={stats.byStatus['cancelled'] || 0}
            label="Cancelled"
            onClick={() => handleStatClick('cancelled')}
            className={getStatClasses('cancelled', true)}
            status="cancelled"
          />
        </div>
      </div>
    );

    return (
      <Popover>
        <PopoverTrigger asChild>
          <BarChart3 className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Quick Stats</h4>
            {detailedContent}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return null;
}
