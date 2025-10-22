/**
 * Global Agent Sessions Page
 * 
 * Displays all AI agent sessions across all projects with filtering and search
 */

import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function SessionsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Sessions</h1>
          <p className="text-muted-foreground mt-2">
            View and manage AI coding agent sessions across all projects
          </p>
        </div>
      </div>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-32 w-full" />}>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-muted-foreground mb-4 text-4xl">⚡</div>
              <h3 className="text-lg font-semibold mb-2">No Active Sessions</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                No agents are currently running. Start a coding session with your AI agent to see it here.
              </p>
            </div>
          </Suspense>
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-muted-foreground mb-4 text-4xl">📊</div>
              <h3 className="text-lg font-semibold mb-2">No Session History</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Once you start using AI coding agents, their sessions will appear here for review and analysis.
              </p>
            </div>
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
