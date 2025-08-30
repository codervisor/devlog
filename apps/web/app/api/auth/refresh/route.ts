/**
 * Token refresh endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = refreshSchema.parse(body);

    // Dynamic import to keep server-only
    const { PrismaAuthService } = await import('@codervisor/devlog-core/auth');
    const authService = PrismaAuthService.getInstance();
    const newTokens = await authService.refreshToken(validatedData.refreshToken);

    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      tokens: newTokens,
    }, { status: 200 });

  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid or expired refresh token',
    }, { status: 401 });
  }
}