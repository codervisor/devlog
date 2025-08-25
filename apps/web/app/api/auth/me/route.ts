/**
 * Get current user information endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';

export const GET = withAuth(async (req) => {
  return NextResponse.json({
    success: true,
    user: req.user,
  }, { status: 200 });
});