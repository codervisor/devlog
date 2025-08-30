/**
 * Get current user information endpoint
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, {
        status: 401,
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Dynamic import to keep server-only
    const { PrismaAuthService } = await import('@codervisor/devlog-core/server');
    const authService = PrismaAuthService.getInstance();
    await authService.initialize();
    
    const user = await authService.validateToken(token);

    return NextResponse.json({
      success: true,
      user,
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: 'Invalid or expired token' }, {
      status: 401,
    });
  }
}