/**
 * Main Agent Observability Dashboard
 * 
 * Primary landing page showing real-time agent activity across all projects
 */

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardStats, RecentActivity, ActiveSessions } from '@/components/agent-observability/dashboard';

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Activity Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitor AI coding agents in real-time across all your projects
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <DashboardStats />
      </Suspense>

      {/* Recent Activity */}
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <RecentActivity />
      </Suspense>

      {/* Active Sessions */}
      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <ActiveSessions />
      </Suspense>
    </div>
  );
}
