/**
 * Dashboard Statistics Component
 * 
 * Server component that fetches and displays real-time dashboard metrics
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Zap, Clock, TrendingUp } from 'lucide-react';

interface DashboardStats {
  activeSessions: number;
  totalEventsToday: number;
  averageDuration: number;
  eventsPerMinute: number;
}

async function fetchDashboardStats(): Promise<DashboardStats | null> {
  try {
    // Use absolute URL for server-side fetch
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';
    const response = await fetch(`${baseUrl}/api/dashboard/stats`, {
      cache: 'no-store', // Always fetch fresh data
    });

    if (!response.ok) {
      console.error('Failed to fetch dashboard stats:', response.statusText);
      return null;
    }

    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return null;
  }
}

function formatDuration(ms: number): string {
  if (ms === 0) return '-';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export async function DashboardStats() {
  const stats = await fetchDashboardStats();

  // Fallback to zero values if fetch fails
  const {
    activeSessions = 0,
    totalEventsToday = 0,
    averageDuration = 0,
    eventsPerMinute = 0,
  } = stats || {};

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeSessions}</div>
          <p className="text-xs text-muted-foreground">
            {activeSessions === 0 ? 'No active agent sessions' : 'Currently running'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Events Today</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalEventsToday}</div>
          <p className="text-xs text-muted-foreground">
            {totalEventsToday === 0 ? 'No events logged' : 'Agent events logged'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Session Duration</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatDuration(averageDuration)}</div>
          <p className="text-xs text-muted-foreground">
            {averageDuration === 0 ? 'No sessions yet' : 'Across all sessions'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Events Per Minute</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{eventsPerMinute.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">
            {eventsPerMinute === 0 ? 'No activity' : 'Current rate'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
