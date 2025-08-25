/**
 * GitHub OAuth callback endpoint
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth error
    if (error) {
      console.error('GitHub OAuth error:', error);
      return NextResponse.redirect(new URL('/login?error=oauth_error', req.url));
    }

    // Validate required parameters
    if (!code) {
      console.error('GitHub OAuth: No authorization code received');
      return NextResponse.redirect(new URL('/login?error=oauth_invalid', req.url));
    }

    // Dynamic import to keep server-only
    const { SSOService, AuthService } = await import('@codervisor/devlog-core/auth');
    
    const ssoService = SSOService.getInstance();
    const authService = AuthService.getInstance();

    // Exchange code for user info
    const ssoUserInfo = await ssoService.exchangeCodeForUser('github', code, state || undefined);

    // Handle SSO login/registration
    const authResponse = await authService.handleSSOLogin(ssoUserInfo);

    // Parse return URL from state
    let returnUrl = '/projects';
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        if (stateData.returnUrl) {
          returnUrl = stateData.returnUrl;
        }
      } catch (error) {
        console.warn('Failed to parse state:', error);
      }
    }

    // Create response with tokens
    const response = NextResponse.redirect(new URL(returnUrl, req.url));
    
    // Set HTTP-only cookies for security
    response.cookies.set('accessToken', authResponse.tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    response.cookies.set('refreshToken', authResponse.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not configured')) {
        return NextResponse.redirect(new URL('/login?error=oauth_not_configured', req.url));
      }
      if (error.message.includes('No email')) {
        return NextResponse.redirect(new URL('/login?error=oauth_no_email', req.url));
      }
    }

    return NextResponse.redirect(new URL('/login?error=oauth_failed', req.url));
  }
}