/**
 * Session Card Component
 * 
 * Displays a single agent session with key metrics
 */

'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AgentSession } from '@codervisor/devlog-core';
import { formatDistanceToNow } from 'date-fns';

interface SessionCardProps {
  session: AgentSession;
  projectName: string;
}

const outcomeColors = {
  success: 'bg-green-100 text-green-800 border-green-200',
  partial: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  failure: 'bg-red-100 text-red-800 border-red-200',
  abandoned: 'bg-gray-100 text-gray-800 border-gray-200',
};

const agentNames = {
  'github-copilot': 'GitHub Copilot',
  'claude-code': 'Claude Code',
  'cursor': 'Cursor',
  'gemini-cli': 'Gemini CLI',
  'cline': 'Cline',
  'aider': 'Aider',
  'mcp-generic': 'MCP Generic',
};

export function SessionCard({ session, projectName }: SessionCardProps) {
  const startTime = new Date(session.startTime);
  const timeAgo = formatDistanceToNow(startTime, { addSuffix: true });
  const duration = session.duration ? `${Math.floor(session.duration / 60)}m ${session.duration % 60}s` : 'In progress';
  
  return (
    <Link href={`/projects/${projectName}/agent-sessions/${session.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">
                {agentNames[session.agentId as keyof typeof agentNames] || session.agentId}
              </CardTitle>
              <CardDescription>
                Started {timeAgo} • {duration}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {session.outcome && (
                <Badge 
                  variant="outline" 
                  className={outcomeColors[session.outcome as keyof typeof outcomeColors]}
                >
                  {session.outcome}
                </Badge>
              )}
              {session.qualityScore !== undefined && (
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                  Quality: {Math.round(session.qualityScore)}%
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Events</div>
              <div className="font-semibold">{session.metrics.eventsCount || 0}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Files Modified</div>
              <div className="font-semibold">{session.metrics.filesModified || 0}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Lines Changed</div>
              <div className="font-semibold">
                +{session.metrics.linesAdded || 0} -{session.metrics.linesRemoved || 0}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Tokens Used</div>
              <div className="font-semibold">
                {(session.metrics.tokensUsed || 0).toLocaleString()}
              </div>
            </div>
          </div>
          
          {session.context.objective && (
            <div className="mt-4 text-sm text-muted-foreground">
              <span className="font-medium">Objective:</span> {session.context.objective}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
