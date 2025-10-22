/**
 * Session Header Component
 * 
 * Displays session overview including objective, status, duration, and outcome
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Activity } from 'lucide-react';
import type { AgentSession } from '@codervisor/devlog-core';

interface SessionHeaderProps {
  session: AgentSession;
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '-';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getOutcomeBadge(outcome?: string) {
  if (!outcome) {
    return <Badge variant="secondary">In Progress</Badge>;
  }

  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    success: 'default',
    partial: 'secondary',
    failure: 'destructive',
    cancelled: 'outline',
  };

  return (
    <Badge variant={variants[outcome] || 'secondary'}>
      {outcome.charAt(0).toUpperCase() + outcome.slice(1)}
    </Badge>
  );
}

export function SessionHeader({ session }: SessionHeaderProps) {
  const objective = session.context?.objective || 'No objective specified';
  const isActive = !session.endTime;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Session ID and Status */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">{objective}</h2>
              <p className="text-sm text-muted-foreground">Session ID: {session.id}</p>
            </div>
            {getOutcomeBadge(session.outcome)}
          </div>

          {/* Agent Info */}
          <div className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{session.agentId}</span>
            <span className="text-muted-foreground">v{session.agentVersion}</span>
          </div>

          {/* Timing Info */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium">Started</p>
                <p className="text-muted-foreground">{formatDate(session.startTime)}</p>
              </div>
            </div>

            {session.endTime && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <p className="font-medium">Ended</p>
                  <p className="text-muted-foreground">{formatDate(session.endTime)}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium">Duration</p>
                <p className="text-muted-foreground">
                  {isActive ? 'In progress...' : formatDuration(session.duration)}
                </p>
              </div>
            </div>
          </div>

          {/* Quality Score */}
          {session.qualityScore !== undefined && (
            <div className="pt-2 border-t">
              <div className="text-sm">
                <span className="font-medium">Quality Score: </span>
                <span className="text-muted-foreground">{session.qualityScore}/100</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
