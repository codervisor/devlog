import { NextRequest, NextResponse } from 'next/server';
import {
  RouteParams,
  ServiceHelper,
  ApiErrors,
  createSuccessResponse,
  withErrorHandling,
} from '@/lib/api-utils';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// POST /api/projects/[id]/devlogs/batch/delete - Batch delete devlog entries
export const POST = withErrorHandling(
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

    // Parse request body
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return ApiErrors.invalidRequest('ids (non-empty array) is required');
    }

    // Get devlog service
    const devlogService = await ServiceHelper.getDevlogService(projectId);

    const deletedIds = [];
    const errors = [];

    // Process each ID
    for (const id of ids) {
      try {
        const devlogId = parseInt(id);
        if (isNaN(devlogId)) {
          errors.push({ id, error: 'Invalid devlog ID' });
          continue;
        }

        const existingEntry = await devlogService.get(devlogId);
        if (!existingEntry) {
          errors.push({ id, error: 'Entry not found' });
          continue;
        }

        await devlogService.delete(devlogId);
        deletedIds.push(devlogId);
      } catch (error) {
        errors.push({
          id,
          error: error instanceof Error ? error.message : 'Delete failed',
        });
      }
    }

    return createSuccessResponse({
      deleted: deletedIds,
      errors: errors.length > 0 ? errors : undefined,
    });
  },
);
