/**
 * API endpoint for global agent sessions
 *
 * GET - Returns agent sessions across all projects with filtering and search
 * POST - Creates a new agent session
 */

import { NextRequest, NextResponse } from 'next/server';
import { AgentSessionService } from '@codervisor/devlog-core/server';
import type { CreateAgentSessionInput } from '@codervisor/devlog-core/types-only';

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
      { status: 500 },
    );
  }
}

/**
 * POST /api/sessions - Create a new agent session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.agentId || !body.agentVersion || !body.projectId || !body.context) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: agentId, agentVersion, projectId, context',
        },
        { status: 400 },
      );
    }

    // Validate context required fields
    if (!body.context.branch || !body.context.initialCommit || !body.context.triggeredBy) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required context fields: branch, initialCommit, triggeredBy',
        },
        { status: 400 },
      );
    }

    // Validate and parse projectId
    const projectId =
      typeof body.projectId === 'number' ? body.projectId : parseInt(body.projectId, 10);
    if (isNaN(projectId) || projectId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid projectId: must be a positive integer',
        },
        { status: 400 },
      );
    }

    // Create session input
    const sessionInput: CreateAgentSessionInput = {
      agentId: body.agentId,
      agentVersion: body.agentVersion,
      projectId: projectId,
      context: body.context,
    };

    const sessionService = AgentSessionService.getInstance(sessionInput.projectId);
    await sessionService.initialize();

    // Start the session
    const session = await sessionService.startSession(sessionInput);

    return NextResponse.json(
      {
        success: true,
        data: session,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create session',
      },
      { status: 500 },
    );
  }
}
