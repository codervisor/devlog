import { NextResponse } from 'next/server';
import { serverRealtimeService } from '@/lib/api/server-realtime';

export const dynamic = 'force-dynamic';

/**
 * GET /api/realtime/config
 *
 * Returns the server's realtime configuration so clients know which provider to use
 */
export async function GET() {
  try {
    const config = serverRealtimeService.getRealtimeConfig();

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('[Realtime Config API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get realtime configuration',
      },
      { status: 500 },
    );
  }
}
