'use client';

import { Skeleton } from '@/components/ui/skeleton';
import React from 'react';

export function AppLayoutSkeleton() {
  return (
    <div className="min-h-screen bg-background w-full flex flex-col">
      {/* Header skeleton */}
      <div className="h-12 border-b border-border bg-background px-4 flex items-center">
        <Skeleton className="h-6 w-32" />
      </div>

      <div className="flex flex-1">
        {/* Sidebar skeleton */}
        <div className="w-64 border-r border-border bg-background p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </div>
        </div>

        {/* Content skeleton */}
        <div className="flex-1 p-6">
          <div className="space-y-4">
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
