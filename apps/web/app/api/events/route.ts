import { NextRequest } from 'next/server';
import { activeConnections } from '@/lib/api/server-realtime';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

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
