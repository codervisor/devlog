/**
 * Server-Sent Events (SSE) endpoint for real-time updates
 * 
 * Provides a persistent connection that streams updates about:
 * - New agent events
 * - Session status changes
 * - Dashboard metrics updates
 * 
 * Supports hierarchy-based filtering:
 * - projectId: Filter events by project
 * - machineId: Filter events by machine
 * - workspaceId: Filter events by workspace
 */

import { NextRequest } from 'next/server';
import { getPrismaClient } from '@codervisor/devlog-core/server';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Keep-alive interval in milliseconds
const KEEP_ALIVE_INTERVAL = 30000; // 30 seconds
// Polling interval for new events
const POLL_INTERVAL = 5000; // 5 seconds

export async function GET(request: NextRequest) {
  // Parse filter parameters
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const machineId = searchParams.get('machineId');
  const workspaceId = searchParams.get('workspaceId');

  // Build filter for events
  const filters = {
    projectId: projectId ? parseInt(projectId, 10) : undefined,
    machineId: machineId ? parseInt(machineId, 10) : undefined,
    workspaceId: workspaceId ? parseInt(workspaceId, 10) : undefined,
  };

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let lastTimestamp = new Date();

      // Send initial connection message
      const connectionMessage = `event: connected\ndata: ${JSON.stringify({ 
        timestamp: new Date().toISOString(),
        filters,
      })}\n\n`;
      controller.enqueue(encoder.encode(connectionMessage));

      // Set up keep-alive heartbeat
      const keepAliveInterval = setInterval(() => {
        try {
          const heartbeat = `: heartbeat ${Date.now()}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        } catch (error) {
          console.error('[SSE] Error sending heartbeat:', error);
          clearInterval(keepAliveInterval);
          clearInterval(pollInterval);
        }
      }, KEEP_ALIVE_INTERVAL);

      // Poll for new events
      const pollInterval = setInterval(async () => {
        try {
          const prisma = getPrismaClient();
          
          // Build where clause based on filters
          const where: any = {
            timestamp: {
              gte: lastTimestamp,
            },
          };

          if (filters.projectId) {
            where.projectId = filters.projectId;
          }

          if (filters.machineId) {
            where.session = {
              workspace: {
                machineId: filters.machineId,
              },
            };
          }

          if (filters.workspaceId) {
            where.session = {
              ...where.session,
              workspaceId: filters.workspaceId,
            };
          }

          // Fetch new events
          const events = await prisma.agentEvent.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: 50,
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

          if (events.length > 0) {
            // Update last timestamp
            lastTimestamp = new Date(events[0].timestamp);

            // Send events to client
            const message = `event: events\ndata: ${JSON.stringify({
              type: 'events',
              data: events,
            })}\n\n`;
            controller.enqueue(encoder.encode(message));
          }
        } catch (error) {
          console.error('[SSE] Error polling events:', error);
          const errorMessage = `event: error\ndata: ${JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          })}\n\n`;
          controller.enqueue(encoder.encode(errorMessage));
        }
      }, POLL_INTERVAL);

      // Clean up when client disconnects
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAliveInterval);
        clearInterval(pollInterval);
        try {
          controller.close();
        } catch (error) {
          // Controller already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
