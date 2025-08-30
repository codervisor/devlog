import { NextRequest } from 'next/server';
import { PrismaDevlogService, PrismaProjectService } from '@codervisor/devlog-core/server';
import { ApiErrors, createSuccessResponse, RouteParams, ServiceHelper } from '@/lib/api/api-utils';
import { RealtimeEventType } from '@/lib/realtime';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects/[name]/devlog/[id] - Get specific devlog entry
export async function GET(
  request: NextRequest,
  { params }: { params: { name: string; devlogId: string } },
) {
  try {
    // Parse and validate parameters
    const paramResult = RouteParams.parseProjectNameAndDevlogId(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectName, devlogId } = paramResult.data;

    // Parse query parameters for notes
    const { searchParams } = new URL(request.url);
    const includeNotes = searchParams.get('includeNotes') !== 'false'; // Include by default
    const notesLimit = searchParams.get('notesLimit')
      ? parseInt(searchParams.get('notesLimit')!)
      : undefined;

    // Get project using helper
    const projectResult = await ServiceHelper.getProjectByNameOrFail(projectName);
    if (!projectResult.success) {
      return projectResult.response;
    }

    const project = projectResult.data.project;

    const devlogService = PrismaDevlogService.getInstance(project.id);
    await devlogService.ensureInitialized();
    const entry = await devlogService.get(devlogId);

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

// PUT /api/projects/[name]/devlog/[id] - Update devlog entry
export async function PUT(
  request: NextRequest,
  { params }: { params: { name: string; devlogId: string } },
) {
  try {
    // Parse and validate parameters
    const paramResult = RouteParams.parseProjectNameAndDevlogId(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectName, devlogId } = paramResult.data;

    const projectResult = await ServiceHelper.getProjectByNameOrFail(projectName);
    if (!projectResult.success) {
      return projectResult.response;
    }

    const project = projectResult.data.project;

    const data = await request.json();

    const devlogService = PrismaDevlogService.getInstance(project.id);

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
      projectId: project.id, // Ensure project context is maintained
      updatedAt: new Date().toISOString(),
    };

    // Set closedAt timestamp when status changes to 'done' or 'cancelled'
    if (data.status && (data.status === 'done' || data.status === 'cancelled')) {
      // Only set closedAt if it wasn't already set or if status is changing to closed
      if (!existingEntry.closedAt || (existingEntry.status !== 'done' && existingEntry.status !== 'cancelled')) {
        updatedEntry.closedAt = new Date().toISOString();
      }
    } else if (data.status && data.status !== 'done' && data.status !== 'cancelled') {
      // Clear closedAt if status is changing back to an open status
      updatedEntry.closedAt = null;
    }

    await devlogService.save(updatedEntry);

    // Transform and return updated entry
    return createSuccessResponse(updatedEntry, { sseEventType: RealtimeEventType.DEVLOG_UPDATED });
  } catch (error) {
    console.error('Error updating devlog:', error);
    const message = error instanceof Error ? error.message : 'Failed to update devlog';
    return ApiErrors.internalError(message);
  }
}

// DELETE /api/projects/[name]/devlog/[id] - Delete devlog entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: { name: string; devlogId: string } },
) {
  try {
    // Parse and validate parameters
    const paramResult = RouteParams.parseProjectNameAndDevlogId(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectName, devlogId } = paramResult.data;

    const projectResult = await ServiceHelper.getProjectByNameOrFail(projectName);
    if (!projectResult.success) {
      return projectResult.response;
    }

    const project = projectResult.data.project;

    const devlogService = PrismaDevlogService.getInstance(project.id);

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
