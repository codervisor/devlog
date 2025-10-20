/**
 * Active Sessions Panel Component
 * 
 * Displays currently active agent sessions with real-time updates
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AgentSession } from '@codervisor/devlog-core';
import { Activity } from 'lucide-react';

interface ActiveSessionsPanelProps {
  projectName: string;
}

export function ActiveSessionsPanel({ projectName }: ActiveSessionsPanelProps) {
  const [activeSessions, setActiveSessions] = useState<AgentSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActiveSessions() {
      try {
        const response = await fetch(`/api/projects/${projectName}/agent-sessions?outcome=`);
        const data = await response.json();
        
        if (data.success) {
          // Filter for sessions without endTime (active sessions)
          const active = (data.data || []).filter((s: AgentSession) => !s.endTime);
          setActiveSessions(active);
        }
      } catch (error) {
        console.error('Failed to fetch active sessions:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchActiveSessions();
    
    // Refresh every 5 seconds
    const interval = setInterval(fetchActiveSessions, 5000);
    return () => clearInterval(interval);
  }, [projectName]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 animate-pulse" />
            Active Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-20 bg-gray-100 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Active Sessions
          {activeSessions.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeSessions.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeSessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No active sessions</p>
            <p className="text-sm mt-1">AI agent sessions will appear here when they start</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <div>
                    <div className="font-medium">{session.agentId}</div>
                    <div className="text-sm text-muted-foreground">
                      {session.context.objective || 'In progress...'}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {session.metrics.eventsCount || 0} events
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
