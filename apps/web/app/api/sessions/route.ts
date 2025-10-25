/**
 * API endpoint for global agent sessions
 * 
 * Returns agent sessions across all projects with filtering and search
 */

import { NextRequest, NextResponse } from 'next/server';
import { AgentSessionService } from '@codervisor/devlog-core/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const agentId = searchParams.get('agentId') || undefined;
    const outcome = searchParams.get('outcome') || undefined;
    const status = searchParams.get('status') || undefined; // 'active' or 'completed'
    const startTimeFrom = searchParams.get('startTimeFrom') || undefined;
    const startTimeTo = searchParams.get('startTimeTo') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Support optional projectId parameter
    const projectIdParam = searchParams.get('projectId');
    const projectId = projectIdParam ? parseInt(projectIdParam) : undefined;

    const sessionService = AgentSessionService.getInstance(projectId);
    await sessionService.initialize();

    // Build filter
    const filter: any = { limit, offset };
    if (projectId !== undefined) {
      filter.projectId = projectId;
    }
    if (agentId) filter.agentId = agentId;
    if (outcome) filter.outcome = outcome;
    if (startTimeFrom) filter.startTimeFrom = new Date(startTimeFrom);
    if (startTimeTo) filter.startTimeTo = new Date(startTimeTo);

    // Get sessions based on status
    let sessions;
    if (status === 'active') {
      sessions = await sessionService.getActiveSessions();
    } else {
      sessions = await sessionService.listSessions(filter);
    }

    return NextResponse.json({
      success: true,
      data: sessions,
      pagination: {
        limit,
        offset,
        total: sessions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch sessions',
      },
      { status: 500 }
    );
  }
}
