import { NextRequest, NextResponse } from 'next/server';
import {
  RouteParams,
  ServiceHelper,
  ApiErrors,
  createSuccessResponse,
  withErrorHandling,
} from '@/lib/api/api-utils';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects/[name]/devlog/stats/overview - Get overview statistics
export const GET = withErrorHandling(
  async (request: NextRequest, { params }: { params: { name: string } }) => {
    // Parse and validate parameters
    const paramResult = RouteParams.parseProjectName(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectName } = paramResult.data;

    // Get project using helper
    const projectResult = await ServiceHelper.getProjectByNameOrFail(projectName);
    if (!projectResult.success) {
      return projectResult.response;
    }

    const project = projectResult.data.project;

    // Get devlog service and stats
    const devlogService = await ServiceHelper.getPrismaDevlogService(project.id);
    const stats = await devlogService.getStats();

    return createSuccessResponse(stats);
  },
);
