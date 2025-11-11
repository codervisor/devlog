/**
 * Sessions List Component
 * 
 * Server component that displays all agent sessions with filtering
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AgentSession {
  id: string;
  agentId: string;
  projectId: number;
  objective?: string;
  startTime: string;
  endTime?: string;
  outcome?: string;
  summary?: string;
}

async function fetchSessions(status?: string, projectId?: string): Promise<AgentSession[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';
    const url = new URL(`${baseUrl}/api/sessions`);
    
    if (status) {
      url.searchParams.set('status', status);
    }
    if (projectId) {
      url.searchParams.set('projectId', projectId);
    }
    
    const response = await fetch(url.toString(), {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Failed to fetch sessions:', response.statusText);
      return [];
    }

    const result = await response.json();
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(startTime: string, endTime?: string): string {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  return `${diffHours}h ${diffMins % 60}m`;
}

function getOutcomeBadge(outcome?: string) {
  if (!outcome) {
    return <Badge className="bg-green-500">Active</Badge>;
  }
  
  const colors: Record<string, string> = {
    success: 'bg-green-500',
    failure: 'bg-red-500',
    partial: 'bg-yellow-500',
    cancelled: 'bg-gray-500',
  };
  
  return (
    <Badge className={colors[outcome] || 'bg-gray-500'}>
      {outcome}
    </Badge>
  );
}

interface SessionsListProps {
  status?: string;
  title: string;
  searchParams?: { [key: string]: string | string[] | undefined };
}

export async function SessionsList({ status, title, searchParams }: SessionsListProps) {
  const projectId = searchParams?.projectId as string | undefined;
  const sessions = await fetchSessions(status, projectId);

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-muted-foreground mb-4 text-4xl">
              {status === 'active' ? '⚡' : '📊'}
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {status === 'active' ? 'No Active Sessions' : 'No Session History'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {status === 'active'
                ? 'No agents are currently running. Start a coding session with your AI agent to see it here.'
                : 'Once you start using AI coding agents, their sessions will appear here for review and analysis.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sessions.map((session) => (
            <div key={session.id} className="p-4 rounded-lg border hover:bg-accent/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getOutcomeBadge(session.outcome)}
                  <Badge variant="outline" className="text-xs">
                    {session.agentId}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDuration(session.startTime, session.endTime)}
                </div>
              </div>
              
              {session.objective && (
                <h4 className="font-medium text-sm mb-1">{session.objective}</h4>
              )}
              
              {session.summary && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {session.summary}
                </p>
              )}
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Started {formatTimestamp(session.startTime)}</span>
                {session.endTime && (
                  <span>Ended {formatTimestamp(session.endTime)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
