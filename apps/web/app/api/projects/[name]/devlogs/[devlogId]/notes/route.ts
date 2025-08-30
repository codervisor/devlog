import { NextRequest } from 'next/server';
import { ApiErrors } from '@/lib/api/api-utils';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// Notes feature temporarily disabled during Prisma migration
export async function GET(request: NextRequest, { params }: { params: { name: string; devlogId: string } }) {
  return ApiErrors.internalError('Notes feature temporarily unavailable during migration');
}

export async function POST(request: NextRequest, { params }: { params: { name: string; devlogId: string } }) {
  return ApiErrors.internalError('Notes feature temporarily unavailable during migration');
}