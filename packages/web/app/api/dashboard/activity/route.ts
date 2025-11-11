/**
 * API endpoint for recent agent activity
 *
 * Returns a timeline of recent agent events across all projects
 */

import { NextRequest, NextResponse } from 'next/server';
import { AgentEventService } from '@codervisor/devlog-core/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');

    // Support optional projectId parameter
    const projectIdParam = searchParams.get('projectId');
    const projectId = projectIdParam ? parseInt(projectIdParam) : undefined;

    const eventService = AgentEventService.getInstance(projectId);
    await eventService.initialize();

    // Build event filter
    const eventFilter: any = { limit };
    if (projectId !== undefined) {
      eventFilter.projectId = projectId;
    }

    // Get recent events
    const events = await eventService.getEvents(eventFilter);

    return NextResponse.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch recent activity',
      },
      { status: 500 },
    );
  }
}
