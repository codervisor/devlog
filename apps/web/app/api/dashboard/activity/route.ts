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
    
    // Get all projects (for now, using projectId 1 as default)
    // TODO: Query across all user's projects
    const projectId = 1;

    const eventService = AgentEventService.getInstance(projectId);
    await eventService.initialize();

    // Get recent events
    const events = await eventService.getEvents({
      projectId,
      limit,
    });

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
      { status: 500 }
    );
  }
}
