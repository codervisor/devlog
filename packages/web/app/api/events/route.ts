import { NextRequest } from 'next/server';
import { activeConnections } from '@/lib/sse-manager';
import { sseEventBridge } from '@/lib/sse-event-bridge';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Initialize the SSE event bridge to connect devlog events to SSE broadcasts
  await sseEventBridge.initialize();
  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to active connections
      activeConnections.add(controller);
      
      // Send initial connection event
      const data = JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString(),
      });
      
      try {
        controller.enqueue(`data: ${data}\n\n`);
      } catch (error) {
        console.error('Error sending initial SSE message:', error);
      }
      
      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        activeConnections.delete(controller);
        try {
          controller.close();
        } catch (error) {
          // Connection already closed
        }
      });
    },
    
    cancel() {
      // Remove this connection when cancelled
      activeConnections.delete(this as any);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}
