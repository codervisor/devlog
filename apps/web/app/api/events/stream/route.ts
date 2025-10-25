/**
 * Server-Sent Events (SSE) endpoint for real-time updates
 * 
 * Provides a persistent connection that streams updates about:
 * - New agent sessions
 * - Session status changes
 * - New agent events
 * - Dashboard metrics updates
 */

import { NextRequest } from 'next/server';
import { EventBroadcaster } from '@/lib/realtime/event-broadcaster';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Keep-alive interval in milliseconds
const KEEP_ALIVE_INTERVAL = 30000; // 30 seconds

export async function GET(request: NextRequest) {
  const broadcaster = EventBroadcaster.getInstance();

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      const connectionMessage = `event: connected\ndata: ${JSON.stringify({ 
        timestamp: new Date().toISOString(),
        clientCount: broadcaster.getClientCount() + 1 
      })}\n\n`;
      controller.enqueue(encoder.encode(connectionMessage));

      // Add this client to the broadcaster
      broadcaster.addClient(controller);

      // Set up keep-alive heartbeat
      const keepAliveInterval = setInterval(() => {
        try {
          const heartbeat = `: heartbeat ${Date.now()}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        } catch (error) {
          console.error('Error sending heartbeat:', error);
          clearInterval(keepAliveInterval);
          broadcaster.removeClient(controller);
        }
      }, KEEP_ALIVE_INTERVAL);

      // Clean up when client disconnects
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAliveInterval);
        broadcaster.removeClient(controller);
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
