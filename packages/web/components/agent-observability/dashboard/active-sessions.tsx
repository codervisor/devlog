/**
 * Active Sessions Component
 *
 * Server component that displays currently active agent sessions
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AgentSession {
  id: string;
  agentId: string;
  projectId: number;
  objective?: string;
  startTime: string;
  outcome?: string;
}

interface ActiveSessionsProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

async function fetchActiveSessions(projectId?: string): Promise<AgentSession[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';
    const url = new URL(`${baseUrl}/api/sessions`);
    url.searchParams.set('status', 'active');

    if (projectId) {
      url.searchParams.set('projectId', projectId);
    }

    const response = await fetch(url.toString(), {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Failed to fetch active sessions:', response.statusText);
      return [];
    }

    const result = await response.json();
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    return [];
  }
}

function formatDuration(startTime: string): string {
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  return `${diffHours}h ${diffMins % 60}m`;
}

export async function ActiveSessions({ searchParams }: ActiveSessionsProps) {
  const projectId = searchParams?.projectId as string | undefined;
  const sessions = await fetchActiveSessions(projectId);

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live Agent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-8">No active sessions</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Agent Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-start justify-between p-3 rounded-lg border"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Badge variant="default" className="bg-green-500">
                    Active
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {session.agentId}
                  </Badge>
                </div>
                {session.objective && <p className="text-sm font-medium">{session.objective}</p>}
                <p className="text-xs text-muted-foreground">
                  Running for {formatDuration(session.startTime)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
