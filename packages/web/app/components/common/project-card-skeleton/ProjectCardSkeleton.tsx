'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ProjectCardSkeleton() {
  return (
    <Card className="w-96 h-48">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-6 w-32" />
          <div className="flex items-center gap-2 h-7">
            <Skeleton className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="space-y-2 mb-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex items-center gap-6 flex-wrap">
      {Array.from({ length: count }).map((_, index) => (
        <ProjectCardSkeleton key={index} />
      ))}
    </div>
  );
}
