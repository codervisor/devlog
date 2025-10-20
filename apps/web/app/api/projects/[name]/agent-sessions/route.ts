/**
 * API endpoint for agent sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { AgentSessionService } from '@codervisor/devlog-core/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const projectName = params.name;
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const agentId = searchParams.get('agentId') || undefined;
    const outcome = searchParams.get('outcome') || undefined;
    const startTimeFrom = searchParams.get('startTimeFrom') || undefined;
    const startTimeTo = searchParams.get('startTimeTo') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get project ID from name (simplified - in production, query from database)
    const projectId = 1; // TODO: Query project by name

    const sessionService = AgentSessionService.getInstance(projectId);
    await sessionService.initialize();

    const filter: any = { projectId, limit, offset };
    if (agentId) filter.agentId = agentId;
    if (outcome) filter.outcome = outcome;
    if (startTimeFrom) filter.startTimeFrom = new Date(startTimeFrom);
    if (startTimeTo) filter.startTimeTo = new Date(startTimeTo);

    const sessions = await sessionService.listSessions(filter);

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
    console.error('Error fetching agent sessions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch agent sessions',
      },
      { status: 500 }
    );
  }
}
