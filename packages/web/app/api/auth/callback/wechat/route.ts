/**
 * WeChat OAuth callback endpoint
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // SSO functionality temporarily disabled during Prisma migration
  console.log('GitHub OAuth callback temporarily disabled during migration');
  return NextResponse.redirect(new URL('/login?error=sso_disabled', req.url));
}
