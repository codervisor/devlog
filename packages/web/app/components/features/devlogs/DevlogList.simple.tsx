'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Eye, Edit, Trash2 } from 'lucide-react';
import {
  DevlogEntry,
  DevlogFilter,
  DevlogId,
  PaginationMeta,
} from '@codervisor/devlog-core';
import { DevlogPriorityTag, DevlogStatusTag, DevlogTypeTag, Pagination } from '@/components';
import { formatTimeAgoWithTooltip } from '@/lib/time-utils';
import Link from 'next/link';

interface DevlogListProps {
  devlogs: DevlogEntry[];
  loading: boolean;
  onViewDevlog: (devlog: DevlogEntry) => void;
  onDeleteDevlog: (id: DevlogId) => void;
  onBatchUpdate?: (ids: DevlogId[], updates: any) => Promise<void>;
  onBatchDelete?: (ids: DevlogId[]) => Promise<void>;
  onBatchAddNote?: (ids: DevlogId[], content: string, category?: string) => Promise<void>;
  currentFilters?: DevlogFilter;
  onFilterChange?: (filters: DevlogFilter) => void;
  pagination?: PaginationMeta | null;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export function DevlogList({
  devlogs,
  loading,
  onViewDevlog,
  onDeleteDevlog,
  pagination,
  onPageChange,
  onPageSizeChange,
}: DevlogListProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Devlogs...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border border-border rounded">
                <div className="w-12 h-12 bg-muted rounded animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (devlogs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Devlogs Found</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground">No devlogs match your current filters.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Devlogs ({devlogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {devlogs.map((devlog) => (
              <div
                key={devlog.id}
                className="flex items-start space-x-4 p-4 border border-border rounded hover:bg-muted/50 transition-colors"
              >
                <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center text-primary font-bold text-sm">
                  {devlog.id}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-1 truncate">{devlog.title}</h4>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {devlog.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <DevlogStatusTag status={devlog.status} />
                        <DevlogPriorityTag priority={devlog.priority} />
                        <DevlogTypeTag type={devlog.type} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span 
                          className="text-xs text-muted-foreground"
                          title={formatTimeAgoWithTooltip(devlog.updatedAt).fullDate}
                        >
                          Updated {formatTimeAgoWithTooltip(devlog.updatedAt).timeAgo}
                        </span>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onViewDevlog(devlog)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Link href={`/devlogs/${devlog.id}/edit`}>
                            <Button size="sm" variant="ghost">
                              <Edit className="h-3 w-3" />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => devlog.id && onDeleteDevlog(devlog.id)}
                            className="text-destructive hover:text-destructive"
                            disabled={!devlog.id}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {pagination && (
        <Pagination
          pagination={pagination}
          onPageChange={onPageChange || (() => {})}
          onPageSizeChange={onPageSizeChange || (() => {})}
        />
      )}
    </div>
  );
}
