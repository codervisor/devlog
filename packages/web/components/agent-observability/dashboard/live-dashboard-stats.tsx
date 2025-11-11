/**
 * Live Dashboard Statistics Component
 *
 * Client component that displays real-time dashboard metrics with SSE updates
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Zap, Clock, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { useRealtimeEvents } from '@/lib/hooks/use-realtime-events';

interface DashboardStats {
  activeSessions: number;
  totalEventsToday: number;
  averageDuration: number;
  eventsPerMinute: number;
}

interface LiveDashboardStatsProps {
  initialStats: DashboardStats;
}

function formatDuration(ms: number): string {
  if (ms === 0) return '-';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function LiveDashboardStats({ initialStats }: LiveDashboardStatsProps) {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const { status, subscribe } = useRealtimeEvents({
    onConnected: () => console.log('[Dashboard] Connected to real-time updates'),
    onError: (error) => console.error('[Dashboard] SSE error:', error),
  });

  // Subscribe to stats updates
  useEffect(() => {
    const unsubscribe = subscribe('stats.updated', (data: DashboardStats) => {
      console.log('[Dashboard] Stats updated:', data);
      setStats(data);
    });

    return unsubscribe;
  }, [subscribe]);

  // Subscribe to session events
  useEffect(() => {
    const unsubscribeCreated = subscribe('session.created', () => {
      setStats((prev) => ({
        ...prev,
        activeSessions: prev.activeSessions + 1,
      }));
    });

    const unsubscribeCompleted = subscribe('session.completed', () => {
      setStats((prev) => ({
        ...prev,
        activeSessions: Math.max(0, prev.activeSessions - 1),
      }));
    });

    return () => {
      unsubscribeCreated();
      unsubscribeCompleted();
    };
  }, [subscribe]);

  // Subscribe to event creation
  useEffect(() => {
    const unsubscribe = subscribe('event.created', () => {
      setStats((prev) => ({
        ...prev,
        totalEventsToday: prev.totalEventsToday + 1,
      }));
    });

    return unsubscribe;
  }, [subscribe]);

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-end gap-2">
        {status.connected ? (
          <Badge variant="outline" className="gap-2">
            <Wifi className="h-3 w-3 text-green-600" />
            Live Updates
          </Badge>
        ) : status.reconnecting ? (
          <Badge variant="outline" className="gap-2">
            <Wifi className="h-3 w-3 text-yellow-600 animate-pulse" />
            Reconnecting...
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-2">
            <WifiOff className="h-3 w-3 text-red-600" />
            Disconnected
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSessions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeSessions === 0 ? 'No active agent sessions' : 'Currently running'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events Today</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEventsToday}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalEventsToday === 0 ? 'No events logged' : 'Agent events logged'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats.averageDuration)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.averageDuration === 0 ? 'No sessions yet' : 'Average completion time'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events Per Minute</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.eventsPerMinute.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.eventsPerMinute === 0 ? 'No activity' : 'Current rate'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
