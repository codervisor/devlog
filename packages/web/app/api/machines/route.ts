/**
 * Machine API Endpoints
 *
 * POST /api/machines - Upsert machine
 * GET /api/machines - List all machines
 */

import { NextRequest, NextResponse } from 'next/server';
import { HierarchyService } from '@codervisor/devlog-core/server';
import { MachineCreateSchema } from '@/schemas/hierarchy';
import { ApiValidator } from '@/schemas/validation';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * POST /api/machines - Upsert machine
 *
 * Creates a new machine or updates an existing one based on machineId.
 * Updates lastSeenAt timestamp on each request.
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await ApiValidator.validateJsonBody(request, MachineCreateSchema);

    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;

    // Get hierarchy service
    const hierarchyService = HierarchyService.getInstance();
    await hierarchyService.ensureInitialized();

    // Upsert machine
    const machine = await hierarchyService.upsertMachine(data);

    return NextResponse.json(machine, { status: 200 });
  } catch (error) {
    console.error('[POST /api/machines] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to upsert machine',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/machines - List all machines
 *
 * Returns all machines ordered by last seen time (descending).
 * Includes workspace count for each machine.
 */
export async function GET(request: NextRequest) {
  try {
    // Get hierarchy service
    const hierarchyService = HierarchyService.getInstance();
    await hierarchyService.ensureInitialized();

    // Get Prisma client to fetch machines with counts
    const { getPrismaClient } = await import('@codervisor/devlog-core/server');
    const prisma = getPrismaClient();

    const machines = await prisma.machine.findMany({
      orderBy: { lastSeenAt: 'desc' },
      include: {
        _count: {
          select: { workspaces: true },
        },
      },
    });

    return NextResponse.json(machines);
  } catch (error) {
    console.error('[GET /api/machines] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to list machines',
      },
      { status: 500 },
    );
  }
}
