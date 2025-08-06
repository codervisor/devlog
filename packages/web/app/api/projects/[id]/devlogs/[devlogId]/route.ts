import { NextRequest } from 'next/server';
import { DevlogService, ProjectService } from '@codervisor/devlog-core';
import { ApiErrors, createSuccessResponse, RouteParams } from '@/lib';
import { RealtimeEventType } from '@/lib/realtime';

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

    // Parse query parameters for notes
    const { searchParams } = new URL(request.url);
    const includeNotes = searchParams.get('includeNotes') !== 'false'; // Include by default
    const notesLimit = searchParams.get('notesLimit')
      ? parseInt(searchParams.get('notesLimit')!)
      : undefined;

    const projectService = ProjectService.getInstance();
    const project = await projectService.get(projectId);
    if (!project) {
      return ApiErrors.projectNotFound();
    }

    const devlogService = DevlogService.getInstance(projectId);
    const entry = await devlogService.get(devlogId, includeNotes);

    if (!entry) {
      return ApiErrors.devlogNotFound();
    }

    // If notesLimit is specified and we have notes, limit them to the most recent
    if (entry.notes && notesLimit && entry.notes.length > notesLimit) {
      entry.notes = entry.notes.slice(0, notesLimit);
    }

    // Transform and return entry
    return createSuccessResponse(entry);
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

    // Transform and return updated entry
    return createSuccessResponse(updatedEntry, { sseEventType: RealtimeEventType.DEVLOG_UPDATED });
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

    return createSuccessResponse(
      { deleted: true, devlogId },
      { sseEventType: RealtimeEventType.DEVLOG_DELETED },
    );
  } catch (error) {
    console.error('Error deleting devlog:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete devlog';
    return ApiErrors.internalError(message);
  }
}
