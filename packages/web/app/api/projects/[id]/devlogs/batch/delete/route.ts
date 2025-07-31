import { NextRequest, NextResponse } from 'next/server';
import {
  RouteParams,
  ServiceHelper,
  ApiErrors,
  createSuccessResponse,
  withErrorHandling,
} from '@/lib';
import { broadcastUpdate } from '@/lib/api';

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

    const deletedIds: number[] = [];
    const errors: Array<{ id: any; error: string }> = [];

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

    const result = {
      deleted: deletedIds,
      errors: errors.length > 0 ? errors : undefined,
    };

    // Broadcast batch delete event for successful deletions
    if (deletedIds.length > 0) {
      setTimeout(() => {
        try {
          broadcastUpdate('devlog-batch-deleted', {
            count: deletedIds.length,
            deletedIds: deletedIds,
            deletedAt: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Error broadcasting batch delete SSE:', error);
        }
      }, 0);
    }

    return createSuccessResponse(result);
  },
);
