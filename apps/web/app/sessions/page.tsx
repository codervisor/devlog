/**
 * Global Agent Sessions Page
 * 
 * Displays all AI agent sessions across all projects with filtering and search
 */

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { SessionsList } from '@/components/agent-observability/sessions';
import { ProjectSelector } from '@/components/agent-observability/project-selector';

interface SessionsPageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function SessionsPage({ searchParams }: SessionsPageProps) {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with Project Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Sessions</h1>
          <p className="text-muted-foreground mt-2">
            View and manage AI coding agent sessions across all projects
          </p>
        </div>
        <ProjectSelector />
      </div>

      {/* Active Sessions */}
      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <SessionsList status="active" title="Active Sessions" searchParams={searchParams} />
      </Suspense>

      {/* Recent Sessions */}
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <SessionsList title="Recent Sessions" searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
