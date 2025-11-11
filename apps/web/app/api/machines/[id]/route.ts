/**
 * Machine Detail API Endpoint
 * 
 * GET /api/machines/[id] - Get machine details
 */

import { NextRequest, NextResponse } from 'next/server';
import { HierarchyService } from '@codervisor/devlog-core/server';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * GET /api/machines/:id - Get machine details
 * 
 * Returns machine details including all workspaces and their session counts.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const machineId = parseInt(params.id, 10);

    if (isNaN(machineId)) {
      return NextResponse.json(
        { error: 'Invalid machine ID' },
        { status: 400 }
      );
    }

    // Get Prisma client to fetch machine with workspaces
    const { getPrismaClient } = await import('@codervisor/devlog-core/server');
    const prisma = getPrismaClient();

    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      include: {
        workspaces: {
          include: {
            project: true,
            _count: {
              select: { chatSessions: true },
            },
          },
        },
      },
    });

    if (!machine) {
      return NextResponse.json(
        { error: 'Machine not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(machine);
  } catch (error) {
    console.error('[GET /api/machines/:id] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get machine',
      },
      { status: 500 }
    );
  }
}
