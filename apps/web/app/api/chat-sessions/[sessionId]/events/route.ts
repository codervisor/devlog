/**
 * Chat Session Events API Endpoint
 *
 * GET /api/chat-sessions/[sessionId]/events - Get session events
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@codervisor/devlog-core/server';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * GET /api/chat-sessions/:sessionId/events - Get events for a chat session
 *
 * Returns all agent events associated with the specified chat session,
 * ordered chronologically.
 */
export async function GET(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const { sessionId } = params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return NextResponse.json({ error: 'Invalid session ID format' }, { status: 400 });
    }

    // Get Prisma client
    const prisma = getPrismaClient();

    // Fetch events for the session
    const events = await prisma.agentEvent.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
      include: {
        session: true,
        project: true,
      },
    });

    return NextResponse.json({
      sessionId,
      events,
      count: events.length,
    });
  } catch (error) {
    console.error('[GET /api/chat-sessions/:sessionId/events] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get session events',
      },
      { status: 500 },
    );
  }
}
