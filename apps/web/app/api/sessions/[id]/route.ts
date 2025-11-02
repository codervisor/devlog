/**
 * API endpoint for individual session details
 *
 * GET - Returns complete session information including context, metrics, and outcome
 * PATCH - Updates session (end session, update metrics, set outcome)
 */

import { NextRequest, NextResponse } from 'next/server';
import { AgentSessionService } from '@codervisor/devlog-core/server';
import type { UpdateAgentSessionInput, SessionOutcome } from '@codervisor/devlog-core/types-only';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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
        { status: 404 },
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
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/sessions/[id] - Update an existing session
 *
 * This endpoint supports:
 * - Ending a session with outcome
 * - Updating session metrics
 * - Updating session context
 * - Setting quality score
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();

    // Get session service
    const sessionService = AgentSessionService.getInstance();
    await sessionService.initialize();

    // Check if session exists
    const existingSession = await sessionService.getSession(id);
    if (!existingSession) {
      return NextResponse.json(
        {
          success: false,
          error: `Session not found: ${id}`,
        },
        { status: 404 },
      );
    }

    // Handle special case: ending a session with just outcome
    if (body.outcome && Object.keys(body).length === 1) {
      const updatedSession = await sessionService.endSession(id, body.outcome as SessionOutcome);
      return NextResponse.json({
        success: true,
        data: updatedSession,
      });
    }

    // Handle general update
    const updateInput: UpdateAgentSessionInput = {};

    if (body.endTime) updateInput.endTime = new Date(body.endTime);
    if (body.duration !== undefined) updateInput.duration = body.duration;
    if (body.context) updateInput.context = body.context;
    if (body.metrics) updateInput.metrics = body.metrics;
    if (body.outcome) updateInput.outcome = body.outcome;
    if (body.qualityScore !== undefined) updateInput.qualityScore = body.qualityScore;

    const updatedSession = await sessionService.updateSession(id, updateInput);

    return NextResponse.json({
      success: true,
      data: updatedSession,
    });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update session',
      },
      { status: 500 },
    );
  }
}
