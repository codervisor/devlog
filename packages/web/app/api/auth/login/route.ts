/**
 * User login endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = loginSchema.parse(body);

    // Dynamic import to keep server-only
    const { PrismaAuthService } = await import('@codervisor/devlog-core/server');
    const authService = PrismaAuthService.getInstance();
    await authService.initialize();
    const result = await authService.login(validatedData);

    return NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        user: result.user,
        tokens: result.tokens,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Login error:', error);

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
      if (error.message.includes('Invalid email or password')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid email or password',
          },
          { status: 401 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Login failed',
      },
      { status: 500 },
    );
  }
}
