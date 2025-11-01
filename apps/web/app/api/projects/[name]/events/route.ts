/**
 * Project Events API Endpoint
 *
 * GET /api/projects/[id]/events - Get project events with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@codervisor/devlog-core/server';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/:id/events - Get project events with filters
 *
 * Supports filtering by:
 * - machineId: Filter by specific machine
 * - workspaceId: Filter by specific workspace
 * - from/to: Filter by timestamp range
 * - eventType: Filter by event type
 * - agentId: Filter by agent
 * - severity: Filter by severity level
 * - limit: Maximum number of results (default: 100, max: 1000)
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const projectId = parseInt(params.id, 10);

    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get('machineId');
    const workspaceId = searchParams.get('workspaceId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const eventType = searchParams.get('eventType');
    const agentId = searchParams.get('agentId');
    const severity = searchParams.get('severity');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 1000);

    // Build where clause
    const where: any = {
      projectId,
    };

    // Filter by machine (via workspace via session)
    if (machineId) {
      where.session = {
        workspace: {
          machineId: parseInt(machineId, 10),
        },
      };
    }

    // Filter by workspace (via session)
    if (workspaceId) {
      where.session = {
        ...where.session,
        workspaceId: parseInt(workspaceId, 10),
      };
    }

    // Filter by timestamp range
    if (from || to) {
      where.timestamp = {};
      if (from) {
        try {
          where.timestamp.gte = new Date(from);
        } catch (error) {
          return NextResponse.json({ error: 'Invalid from date' }, { status: 400 });
        }
      }
      if (to) {
        try {
          where.timestamp.lte = new Date(to);
        } catch (error) {
          return NextResponse.json({ error: 'Invalid to date' }, { status: 400 });
        }
      }
    }

    // Filter by event type
    if (eventType) {
      where.eventType = eventType;
    }

    // Filter by agent ID
    if (agentId) {
      where.agentId = agentId;
    }

    // Filter by severity
    if (severity) {
      if (!['info', 'warning', 'error'].includes(severity)) {
        return NextResponse.json(
          { error: 'Invalid severity. Must be: info, warning, or error' },
          { status: 400 },
        );
      }
      where.severity = severity;
    }

    // Get Prisma client and fetch events
    const prisma = getPrismaClient();

    const events = await prisma.agentEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        session: {
          include: {
            workspace: {
              include: {
                machine: true,
                project: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      events,
      count: events.length,
      filters: {
        projectId,
        machineId: machineId ? parseInt(machineId, 10) : undefined,
        workspaceId: workspaceId ? parseInt(workspaceId, 10) : undefined,
        from,
        to,
        eventType,
        agentId,
        severity,
        limit,
      },
    });
  } catch (error) {
    console.error('[GET /api/projects/:id/events] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get project events',
      },
      { status: 500 },
    );
  }
}
