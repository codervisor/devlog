/**
 * Main Agent Observability Dashboard
 * 
 * Primary landing page showing real-time agent activity across all projects
 */

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardStatsWrapper, RecentActivity, ActiveSessions } from '@/components/agent-observability/dashboard';
import { ProjectSelector } from '@/components/agent-observability/project-selector';
import { HierarchyFilter } from '@/components/agent-observability/hierarchy';
import { MachineActivityWidget } from '@/components/agent-observability/widgets';

interface DashboardPageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  const projectId = searchParams?.projectId 
    ? parseInt(Array.isArray(searchParams.projectId) ? searchParams.projectId[0] : searchParams.projectId)
    : undefined;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with Project Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Activity Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitor AI coding agents in real-time across all your projects
          </p>
        </div>
        <ProjectSelector />
      </div>

      {/* Hierarchy Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter by:</span>
        <HierarchyFilter />
      </div>

      {/* Overview Stats with Live Updates */}
      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <DashboardStatsWrapper searchParams={searchParams} />
      </Suspense>

      {/* Machine Activity Widget */}
      <MachineActivityWidget projectId={projectId} />

      {/* Recent Activity */}
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <RecentActivity searchParams={searchParams} />
      </Suspense>

      {/* Active Sessions */}
      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <ActiveSessions searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
