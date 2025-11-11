/**
 * Session Metrics Component
 * 
 * Displays quantitative metrics for the session
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Code, Zap, Terminal, AlertCircle, TestTube, Package } from 'lucide-react';
import type { AgentSession } from '@codervisor/devlog-core';

interface SessionMetricsProps {
  session: AgentSession;
}

export function SessionMetrics({ session }: SessionMetricsProps) {
  const metrics = session.metrics;

  const metricCards = [
    {
      title: 'Events',
      value: metrics.eventsCount,
      icon: Zap,
      description: 'Total events logged',
    },
    {
      title: 'Files Modified',
      value: metrics.filesModified,
      icon: FileText,
      description: 'Files changed',
    },
    {
      title: 'Lines Added',
      value: metrics.linesAdded,
      icon: Code,
      description: 'New lines of code',
      color: 'text-green-600',
    },
    {
      title: 'Lines Removed',
      value: metrics.linesRemoved,
      icon: Code,
      description: 'Lines deleted',
      color: 'text-red-600',
    },
    {
      title: 'Tokens Used',
      value: metrics.tokensUsed,
      icon: Zap,
      description: 'LLM tokens consumed',
    },
    {
      title: 'Commands',
      value: metrics.commandsExecuted,
      icon: Terminal,
      description: 'Commands executed',
    },
    {
      title: 'Errors',
      value: metrics.errorsEncountered,
      icon: AlertCircle,
      description: 'Errors encountered',
      color: metrics.errorsEncountered > 0 ? 'text-red-600' : undefined,
    },
    {
      title: 'Tests Run',
      value: metrics.testsRun,
      icon: TestTube,
      description: `${metrics.testsPassed} passed`,
    },
    {
      title: 'Builds',
      value: metrics.buildAttempts,
      icon: Package,
      description: `${metrics.buildSuccesses} successful`,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
          {metricCards.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.title} className="flex items-start gap-3 p-3 rounded-lg border">
                <Icon className={`h-5 w-5 mt-0.5 ${metric.color || 'text-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none mb-1">{metric.title}</p>
                  <p className={`text-2xl font-bold ${metric.color || ''}`}>{metric.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
