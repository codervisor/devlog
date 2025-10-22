/**
 * Recent Activity Component
 * 
 * Server component that displays recent agent events
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AgentEvent {
  id: string;
  type: string;
  agentId: string;
  sessionId: string;
  timestamp: string;
  context?: Record<string, any>;
}

async function fetchRecentActivity(): Promise<AgentEvent[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';
    const response = await fetch(`${baseUrl}/api/dashboard/activity?limit=10`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Failed to fetch recent activity:', response.statusText);
      return [];
    }

    const result = await response.json();
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getEventColor(eventType: string): string {
  const colors: Record<string, string> = {
    file_write: 'bg-blue-500',
    file_read: 'bg-green-500',
    llm_request: 'bg-purple-500',
    test_execution: 'bg-yellow-500',
    error: 'bg-red-500',
  };
  return colors[eventType] || 'bg-gray-500';
}

export async function RecentActivity() {
  const events = await fetchRecentActivity();

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Agent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-muted-foreground mb-4 text-4xl">🤖</div>
            <h3 className="text-lg font-semibold mb-2">No Agent Activity Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Start monitoring your AI coding agents by configuring collectors and starting agent sessions.
              Visit the Settings page to set up your first collector.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Agent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="flex items-start space-x-4 p-3 rounded-lg border">
              <div className={`w-2 h-2 rounded-full mt-2 ${getEventColor(event.type)}`} />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{event.type.replace(/_/g, ' ')}</span>
                    <Badge variant="outline" className="text-xs">
                      {event.agentId}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(event.timestamp)}
                  </span>
                </div>
                {event.context?.filePath && (
                  <p className="text-xs text-muted-foreground">
                    {event.context.filePath}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
