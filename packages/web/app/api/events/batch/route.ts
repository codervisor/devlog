/**
 * Batch Event Creation API Endpoint
 *
 * POST /api/events/batch - Batch create agent events
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@codervisor/devlog-core/server';
import { BatchEventsCreateSchema } from '@/schemas/hierarchy';
import { ApiValidator } from '@/schemas/validation';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * POST /api/events/batch - Batch create events
 *
 * Creates multiple agent events in a single transaction.
 * Maximum 1000 events per request for performance.
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await ApiValidator.validateJsonBody(request, BatchEventsCreateSchema);

    if (!validation.success) {
      return validation.response;
    }

    const events = validation.data;

    if (events.length === 0) {
      return NextResponse.json({ error: 'At least one event is required' }, { status: 400 });
    }

    // Get Prisma client
    const prisma = getPrismaClient();

    // Auto-create missing machines and workspaces for collector compatibility
    const uniqueMachines = new Map<string, { hostname: string; username: string }>();
    const uniqueWorkspaces = new Map<
      string,
      { workspaceId: string; projectId: number; machineDbId: number; workspacePath: string }
    >();

    // Extract hierarchy information from event contexts
    for (const event of events) {
      const ctx = event.context as any;

      // Extract workspace info if available
      if (ctx?.workspaceId && ctx?.workspacePath) {
        const machineId = ctx.machineId || 'collector-default';

        // Track machine
        if (!uniqueMachines.has(machineId)) {
          uniqueMachines.set(machineId, {
            hostname: ctx.hostname || 'unknown',
            username: ctx.username || 'collector',
          });
        }
      }
    }

    // Create machines if they don't exist
    const machineIdMap = new Map<string, number>();
    for (const [machineId, machineData] of uniqueMachines.entries()) {
      const machine = await prisma.machine.upsert({
        where: { machineId },
        create: {
          machineId,
          hostname: machineData.hostname,
          username: machineData.username,
          osType: 'darwin', // Default, can be updated later
          machineType: 'local',
          metadata: { autoCreated: true },
        },
        update: {},
        select: { id: true },
      });
      machineIdMap.set(machineId, machine.id);
    }

    // Now extract workspaces with resolved machine IDs
    for (const event of events) {
      const ctx = event.context as any;

      if (ctx?.workspaceId && ctx?.workspacePath) {
        const machineId = ctx.machineId || 'collector-default';
        const machineDbId = machineIdMap.get(machineId);

        if (machineDbId && !uniqueWorkspaces.has(ctx.workspaceId)) {
          uniqueWorkspaces.set(ctx.workspaceId, {
            workspaceId: ctx.workspaceId,
            projectId: event.projectId,
            machineDbId,
            workspacePath: ctx.workspacePath,
          });
        }
      }
    }

    // Create workspaces if they don't exist
    for (const [_, workspaceData] of uniqueWorkspaces.entries()) {
      await prisma.workspace.upsert({
        where: {
          workspaceId: workspaceData.workspaceId,
        },
        create: {
          projectId: workspaceData.projectId,
          machineId: workspaceData.machineDbId,
          workspaceId: workspaceData.workspaceId,
          workspacePath: workspaceData.workspacePath,
          workspaceType: 'folder',
        },
        update: {
          workspacePath: workspaceData.workspacePath,
          lastSeenAt: new Date(),
        },
      });
    }

    // Auto-create missing sessions for collector compatibility
    const uniqueSessions = new Map<
      string,
      { agentId: string; agentVersion: string; projectId: number; timestamp: Date }
    >();
    for (const event of events) {
      if (!uniqueSessions.has(event.sessionId)) {
        uniqueSessions.set(event.sessionId, {
          agentId: event.agentId,
          agentVersion: event.agentVersion,
          projectId: event.projectId,
          timestamp: event.timestamp,
        });
      }
    }

    // Create sessions in bulk - skip duplicates for idempotency
    if (uniqueSessions.size > 0) {
      await prisma.agentSession.createMany({
        data: Array.from(uniqueSessions.entries()).map(([sessionId, sessionData]) => ({
          id: sessionId,
          agentId: sessionData.agentId,
          agentVersion: sessionData.agentVersion,
          projectId: sessionData.projectId,
          startTime: sessionData.timestamp,
          context: { autoCreated: true },
          metrics: {},
        })),
        skipDuplicates: true,
      });
    }

    // Use createMany for better performance
    const result = await prisma.agentEvent.createMany({
      data: events.map((event) => ({
        timestamp: event.timestamp,
        eventType: event.eventType,
        agentId: event.agentId,
        agentVersion: event.agentVersion,
        sessionId: event.sessionId,
        projectId: event.projectId,
        context: event.context as any, // Cast to satisfy Prisma JsonValue type
        data: event.data as any,
        metrics: event.metrics as any,
        parentEventId: event.parentEventId,
        relatedEventIds: event.relatedEventIds,
        tags: event.tags,
        severity: event.severity,
      })),
      skipDuplicates: true, // Skip events with duplicate IDs
    });

    return NextResponse.json(
      {
        created: result.count,
        requested: events.length,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[POST /api/events/batch] Error:', error);

    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          {
            error: 'Invalid reference: session or project not found',
            details: error.message,
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create events',
      },
      { status: 500 },
    );
  }
}
