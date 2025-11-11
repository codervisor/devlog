/**
 * Password reset endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const requestResetSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const confirmResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // Dynamic import to keep server-only
    const { PrismaAuthService } = await import('@codervisor/devlog-core/server');
    const authService = PrismaAuthService.getInstance();

    if (action === 'request') {
      const validatedData = requestResetSchema.parse(body);

      // Generate reset token (returns null if email doesn't exist, for security)
      const resetToken = await authService.generatePasswordResetToken(validatedData.email);

      // TODO: Send password reset email with resetToken.token
      // Always return success for security (don't reveal if email exists)

      return NextResponse.json(
        {
          success: true,
          message: 'If your email is registered, you will receive a password reset link.',
        },
        { status: 200 },
      );
    } else if (action === 'confirm') {
      const validatedData = confirmResetSchema.parse(body);

      const user = await authService.resetPassword(validatedData.token, validatedData.newPassword);

      return NextResponse.json(
        {
          success: true,
          message: 'Password reset successfully',
          user,
        },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Use ?action=request or ?action=confirm',
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error('Password reset error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('Invalid or expired')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid or expired reset token',
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Password reset failed',
      },
      { status: 500 },
    );
  }
}
