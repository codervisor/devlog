/**
 * Email verification endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = verifyEmailSchema.parse(body);

    // Dynamic import to keep server-only
    const { PrismaAuthService } = await import('@codervisor/devlog-core/auth');
    const authService = PrismaAuthService.getInstance();
    const user = await authService.verifyEmail(validatedData.token);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      user,
    }, { status: 200 });

  } catch (error) {
    console.error('Email verification error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      }, { status: 400 });
    }

    if (error instanceof Error) {
      if (error.message.includes('Invalid or expired')) {
        return NextResponse.json({
          success: false,
          error: 'Invalid or expired verification token',
        }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Email verification failed',
    }, { status: 500 });
  }
}