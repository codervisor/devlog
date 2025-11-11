/**
 * User registration endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const registrationSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = registrationSchema.parse(body);

    // Dynamic import to keep server-only
    const { PrismaAuthService } = await import('@codervisor/devlog-core/server');
    const authService = PrismaAuthService.getInstance();
    await authService.initialize();
    const result = await authService.register(validatedData);

    // TODO: Send email verification email with result.emailToken
    // For now, we'll just return success

    return NextResponse.json(
      {
        success: true,
        message: 'Registration successful. Please check your email for verification.',
        user: result.user,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Registration error:', error);

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
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          {
            success: false,
            error: 'User with this email already exists',
          },
          { status: 409 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Registration failed',
      },
      { status: 500 },
    );
  }
}
