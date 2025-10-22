/**
 * API endpoint for individual session details
 * 
 * Returns complete session information including context, metrics, and outcome
 */

import { NextRequest, NextResponse } from 'next/server';
import { AgentSessionService } from '@codervisor/devlog-core/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get session service (projectId not required for getSession)
    const sessionService = AgentSessionService.getInstance();
    await sessionService.initialize();

    // Get session by ID
    const session = await sessionService.getSession(id);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: `Session not found: ${id}`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Error fetching session details:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch session details',
      },
      { status: 500 }
    );
  }
}
