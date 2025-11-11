/**
 * SSO Authorization endpoint
 * Initiates OAuth flow for various providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const authorizationSchema = z.object({
  provider: z.enum(['github', 'google', 'wechat']),
  returnUrl: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, returnUrl } = authorizationSchema.parse(body);

    // Dynamic import to keep server-only
    const { SSOService } = await import('@codervisor/devlog-core/server');
    const ssoService = SSOService.getInstance();

    // Generate state for CSRF protection
    const state = returnUrl
      ? Buffer.from(JSON.stringify({ returnUrl })).toString('base64')
      : undefined;

    // Get authorization URL
    const authUrl = ssoService.getAuthorizationUrl(provider, state);

    return NextResponse.json(
      {
        success: true,
        data: {
          authUrl,
          provider,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('SSO authorization error:', error);

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
      if (error.message.includes('not configured')) {
        return NextResponse.json(
          {
            success: false,
            error: 'SSO provider not configured',
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate authorization URL',
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Dynamic import to keep server-only
    const { SSOService } = await import('@codervisor/devlog-core/server');
    const ssoService = SSOService.getInstance();

    // Get available providers
    const providers = ssoService.getAvailableProviders();

    return NextResponse.json(
      {
        success: true,
        data: {
          providers,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('SSO providers error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get available providers',
      },
      { status: 500 },
    );
  }
}
