import { NextRequest, NextResponse } from 'next/server';
import { activeConnections, broadcastUpdate } from '@/lib/api/server-realtime';
import { AgentEventService } from '@codervisor/devlog-core/server';
import type { CreateAgentEventInput } from '@codervisor/devlog-core/types-only';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

/**
 * GET /api/events - Server-Sent Events (SSE) stream for real-time event updates
 */
export async function GET(request: NextRequest) {
  // Create a readable stream for SSE
  console.log('[SSE Route] Creating ReadableStream...');
  const stream = new ReadableStream({
    start(controller) {
      console.log('[SSE Route] Stream started, adding connection...');
      // Add this connection to active connections
      activeConnections.add(controller);

      // Send initial connection event
      const data = JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString(),
      });

      console.log('[SSE Route] Sending initial connection event...');
      try {
        controller.enqueue(`data: ${data}\n\n`);
        console.log('[SSE Route] Initial connection event sent successfully');
      } catch (error) {
        console.error('Error sending initial SSE message:', error);
      }

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log('[SSE Route] Client disconnected, cleaning up...');
        activeConnections.delete(controller);
        try {
          controller.close();
        } catch (error) {
          // Connection already closed
        }
      });

      console.log('[SSE Route] Stream setup completed');
    },

    cancel() {
      console.log('[SSE Route] Stream cancelled');
      // Remove this connection when cancelled
      activeConnections.delete(this as any);
    },
  });

  console.log('[SSE Route] Returning response with SSE headers...');
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

/**
 * POST /api/events - Create a single agent event
 *
 * Creates a single event and broadcasts it to active SSE connections
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (
      !body.type ||
      !body.agentId ||
      !body.agentVersion ||
      !body.sessionId ||
      !body.projectId ||
      !body.context ||
      !body.data
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required fields: type, agentId, agentVersion, sessionId, projectId, context, data',
        },
        { status: 400 },
      );
    }

    // Validate context required field
    if (!body.context.workingDirectory) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required context field: workingDirectory',
        },
        { status: 400 },
      );
    }

    // Create event input
    const eventInput: CreateAgentEventInput = {
      type: body.type,
      agentId: body.agentId,
      agentVersion: body.agentVersion,
      sessionId: body.sessionId,
      projectId: parseInt(body.projectId),
      context: body.context,
      data: body.data,
      metrics: body.metrics,
      parentEventId: body.parentEventId,
      relatedEventIds: body.relatedEventIds,
      tags: body.tags,
      severity: body.severity || 'info',
    };

    const eventService = AgentEventService.getInstance(eventInput.projectId);
    await eventService.initialize();

    // Create the event
    const event = await eventService.collectEvent(eventInput);

    // Broadcast to active SSE connections
    broadcastUpdate('event_created', {
      event: event,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        data: event,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create event',
      },
      { status: 500 },
    );
  }
}
