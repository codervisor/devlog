import { NextRequest, NextResponse } from 'next/server';
import {
  RouteParams,
  ServiceHelper,
  ApiErrors,
  createSuccessResponse,
  withErrorHandling,
} from '@/lib';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects/[id]/devlogs/stats/overview - Get overview statistics
export const GET = withErrorHandling(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    // Parse and validate parameters
    const paramResult = RouteParams.parseProjectId(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectId } = paramResult.data;

    // Ensure project exists
    const projectResult = await ServiceHelper.getProjectOrFail(projectId);
    if (!projectResult.success) {
      return projectResult.response;
    }

    // Get devlog service and stats
    const devlogService = await ServiceHelper.getDevlogService(projectId);
    const stats = await devlogService.getStats();

    return createSuccessResponse(stats);
  },
);
