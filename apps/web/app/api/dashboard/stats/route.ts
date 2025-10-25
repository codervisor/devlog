/**
 * API endpoint for dashboard statistics
 * 
 * Provides aggregated metrics for the main dashboard:
 * - Active sessions count
 * - Total events today
 * - Average session duration
 * - Events per minute rate
 */

import { NextRequest, NextResponse } from 'next/server';
import { AgentSessionService, AgentEventService } from '@codervisor/devlog-core/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Support optional projectId parameter
    // If not provided, query across all projects (pass undefined)
    const projectIdParam = searchParams.get('projectId');
    const projectId = projectIdParam ? parseInt(projectIdParam) : undefined;

    const sessionService = AgentSessionService.getInstance(projectId);
    const eventService = AgentEventService.getInstance(projectId);
    
    await Promise.all([
      sessionService.initialize(),
      eventService.initialize()
    ]);

    // Get active sessions
    const activeSessions = await sessionService.getActiveSessions();
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Build event filter
    const eventFilter: any = {
      startTime: today,
      endTime: tomorrow,
    };
    if (projectId !== undefined) {
      eventFilter.projectId = projectId;
    }

    // Get events from today
    const todayEvents = await eventService.getEvents(eventFilter);

    // Calculate events per minute (based on last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentFilter: any = {
      startTime: oneHourAgo,
    };
    if (projectId !== undefined) {
      recentFilter.projectId = projectId;
    }
    const recentEvents = await eventService.getEvents(recentFilter);
    const eventsPerMinute = recentEvents.length > 0 
      ? (recentEvents.length / 60).toFixed(2)
      : '0';

    // Build session stats filter
    const statsFilter: any = {
      startTimeFrom: today,
    };
    if (projectId !== undefined) {
      statsFilter.projectId = projectId;
    }

    // Get session stats for average duration
    const sessionStats = await sessionService.getSessionStats(statsFilter);

    return NextResponse.json({
      success: true,
      data: {
        activeSessions: activeSessions.length,
        totalEventsToday: todayEvents.length,
        averageDuration: sessionStats.averageDuration || 0,
        eventsPerMinute: parseFloat(eventsPerMinute),
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard statistics',
      },
      { status: 500 }
    );
  }
}
