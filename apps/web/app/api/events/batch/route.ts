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
