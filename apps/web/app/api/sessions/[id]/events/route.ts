/**
 * API endpoint for session events timeline
 * 
 * Returns all events associated with a specific session
 */

import { NextRequest, NextResponse } from 'next/server';
import { AgentEventService } from '@codervisor/devlog-core/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: sessionId } = params;
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const eventType = searchParams.get('eventType') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get event service
    const eventService = AgentEventService.getInstance();
    await eventService.initialize();

    // Get events for this session
    const allEvents = await eventService.getEventsBySession(sessionId);

    // Apply additional filters
    let filteredEvents = allEvents;
    
    if (eventType) {
      filteredEvents = filteredEvents.filter(e => e.type === eventType);
    }
    
    if (severity) {
      filteredEvents = filteredEvents.filter(e => e.severity === severity);
    }

    // Apply pagination
    const paginatedEvents = filteredEvents.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paginatedEvents,
      pagination: {
        limit,
        offset,
        total: filteredEvents.length,
      },
    });
  } catch (error) {
    console.error('Error fetching session events:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch session events',
      },
      { status: 500 }
    );
  }
}
