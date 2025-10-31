/**
 * Agent Sessions Dashboard Page
 * 
 * Displays all AI agent sessions for a project with filtering and search
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { Network } from 'lucide-react';
import { SessionList } from '@/components/agent-observability/agent-sessions/session-list';
import { ActiveSessionsPanel } from '@/components/agent-observability/agent-sessions/active-sessions-panel';
import { Button } from '@/components/ui/button';

export default function AgentSessionsPage({ params }: { params: { name: string } }) {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Sessions</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and analyze AI coding agent activities for {params.name}
          </p>
        </div>
        <Link href={`/projects/${params.name}/hierarchy`}>
          <Button variant="outline" className="gap-2">
            <Network className="w-4 h-4" />
            View Hierarchy
          </Button>
        </Link>
      </div>

      {/* Active Sessions Panel */}
      <Suspense fallback={<div className="animate-pulse h-32 bg-gray-100 rounded-lg" />}>
        <ActiveSessionsPanel projectName={params.name} />
      </Suspense>

      {/* Session History */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Session History</h2>
        <Suspense fallback={<div className="animate-pulse h-96 bg-gray-100 rounded-lg" />}>
          <SessionList projectName={params.name} />
        </Suspense>
      </div>
    </div>
  );
}
