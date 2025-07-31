import { NextRequest, NextResponse } from 'next/server';
import { DevlogService, ProjectService } from '@codervisor/devlog-core';
import { RouteParams, ApiErrors, createSuccessResponse, ResponseTransformer } from '@/lib';
import { DevlogSSE } from '@/lib/api/sse-utils';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// PUT /api/projects/[id]/devlogs/[devlogId]/archive - Archive devlog entry
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

    // Archive the entry
    const archivedEntry = {
      ...existingEntry,
      archived: true,
      updatedAt: new Date().toISOString(),
    };

    await devlogService.save(archivedEntry);

    // Transform and return archived entry
    const transformedEntry = ResponseTransformer.transformDevlog(archivedEntry);
    return DevlogSSE.archived(createSuccessResponse(transformedEntry));
  } catch (error) {
    console.error('Error archiving devlog:', error);
    const message = error instanceof Error ? error.message : 'Failed to archive devlog';
    return ApiErrors.internalError(message);
  }
}
