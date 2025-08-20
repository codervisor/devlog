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

// GET /api/projects/[name]/devlogs/stats/timeseries - Get time series statistics
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

    // Parse query parameters
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const days = parseInt(searchParams.get('days') || '30');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Validate days parameter
    if (isNaN(days) || days <= 0) {
      return ApiErrors.invalidRequest('days parameter must be a positive integer');
    }

    const timeSeriesRequest = {
      days,
      ...(from && { from }),
      ...(to && { to }),
      projectId,
    };

    // Get devlog service and time series stats
    const devlogService = await ServiceHelper.getDevlogService(projectId);
    const stats = await devlogService.getTimeSeriesStats(projectId, timeSeriesRequest);

    return createSuccessResponse(stats);
  },
);
