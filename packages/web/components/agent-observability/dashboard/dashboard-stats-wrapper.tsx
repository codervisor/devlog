/**
 * Dashboard Stats Wrapper
 *
 * Server component that fetches initial data and passes to client component for live updates
 */

import { LiveDashboardStats } from './live-dashboard-stats';

interface DashboardStats {
  activeSessions: number;
  totalEventsToday: number;
  averageDuration: number;
  eventsPerMinute: number;
}

interface DashboardStatsWrapperProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

async function fetchDashboardStats(projectId?: string): Promise<DashboardStats | null> {
  try {
    // Use absolute URL for server-side fetch
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';
    const url = new URL(`${baseUrl}/api/dashboard/stats`);

    // Add projectId if provided
    if (projectId) {
      url.searchParams.set('projectId', projectId);
    }

    const response = await fetch(url.toString(), {
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

export async function DashboardStatsWrapper({ searchParams }: DashboardStatsWrapperProps) {
  const projectId = searchParams?.projectId as string | undefined;
  const stats = await fetchDashboardStats(projectId);

  // Fallback to zero values if fetch fails
  const initialStats = stats || {
    activeSessions: 0,
    totalEventsToday: 0,
    averageDuration: 0,
    eventsPerMinute: 0,
  };

  return <LiveDashboardStats initialStats={initialStats} />;
}
