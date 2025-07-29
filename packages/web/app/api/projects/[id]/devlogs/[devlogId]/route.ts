import { NextRequest, NextResponse } from 'next/server';
import { DevlogService, ProjectService } from '@codervisor/devlog-core';
import { RouteParams, ApiErrors } from '@/lib/api-utils';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects/[id]/devlogs/[devlogId] - Get specific devlog entry
export async function GET(
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
    const entry = await devlogService.get(devlogId);

    if (!entry) {
      return ApiErrors.devlogNotFound();
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error fetching devlog:', error);
    return ApiErrors.internalError('Failed to fetch devlog');
  }
}

// PUT /api/projects/[id]/devlogs/[devlogId] - Update devlog entry
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

    const data = await request.json();

    const devlogService = DevlogService.getInstance(projectId);

    // Verify entry exists and belongs to project
    const existingEntry = await devlogService.get(devlogId);
    if (!existingEntry) {
      return ApiErrors.devlogNotFound();
    }

    // Update entry
    const updatedEntry = {
      ...existingEntry,
      ...data,
      id: devlogId,
      projectId: projectId, // Ensure project context is maintained
      updatedAt: new Date().toISOString(),
    };

    await devlogService.save(updatedEntry);

    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error('Error updating devlog:', error);
    const message = error instanceof Error ? error.message : 'Failed to update devlog';
    return ApiErrors.internalError(message);
  }
}

// DELETE /api/projects/[id]/devlogs/[devlogId] - Delete devlog entry
export async function DELETE(
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

    await devlogService.delete(devlogId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting devlog:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete devlog';
    return ApiErrors.internalError(message);
  }
}
