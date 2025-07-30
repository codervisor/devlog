import { NextRequest, NextResponse } from 'next/server';
import { DevlogService, ProjectService } from '@codervisor/devlog-core';
import {
  RouteParams,
  ApiErrors,
  createSuccessResponse,
  ResponseTransformer,
} from '@/lib/api-utils';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// PUT /api/projects/[id]/devlogs/[devlogId]/unarchive - Unarchive devlog entry
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; devlogId: string } },
) {
  try {
    // Parse and validate parameters
    const paramResult = RouteParams.parseProjectAndDevlogId(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectId, devlogId } = paramResult.data;

    const projectService = ProjectService.getInstance();
    const project = await projectService.get(projectId);
    if (!project) {
      return ApiErrors.projectNotFound();
    }

    const devlogService = DevlogService.getInstance(projectId);

    // Verify entry exists and belongs to project
    const existingEntry = await devlogService.get(devlogId);
    if (!existingEntry) {
      return ApiErrors.devlogNotFound();
    }

    // Unarchive the entry
    const unarchivedEntry = {
      ...existingEntry,
      archived: false,
      updatedAt: new Date().toISOString(),
    };

    await devlogService.save(unarchivedEntry);

    // Transform and return unarchived entry
    const transformedEntry = ResponseTransformer.transformDevlog(unarchivedEntry);
    return createSuccessResponse(transformedEntry);
  } catch (error) {
    console.error('Error unarchiving devlog:', error);
    const message = error instanceof Error ? error.message : 'Failed to unarchive devlog';
    return ApiErrors.internalError(message);
  }
}
