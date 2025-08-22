import { NextRequest } from 'next/server';
import type { DevlogNoteCategory } from '@codervisor/devlog-core';
import { DevlogService, ProjectService } from '@codervisor/devlog-core/server';
import { ApiErrors, createSuccessResponse, RouteParams, ServiceHelper } from '@/lib/api/api-utils';
import { RealtimeEventType } from '@/lib/realtime';
import { z } from 'zod';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// Schema for updating notes
const UpdateNoteBodySchema = z.object({
  content: z.string().min(1, 'Note content is required').optional(),
  category: z.string().optional(),
});

// GET /api/projects/[name]/devlog/[id]/notes/[noteId] - Get specific note
export async function GET(
  request: NextRequest,
  { params }: { params: { name: string; devlogId: string; noteId: string } },
) {
  try {
    // Parse and validate parameters - only parse name and devlogId, handle noteId separately
    const paramResult = RouteParams.parseProjectNameAndDevlogId(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectName, devlogId } = paramResult.data;
    const { noteId } = params;

    // Get project using helper
    const projectResult = await ServiceHelper.getProjectByNameOrFail(projectName);
    if (!projectResult.success) {
      return projectResult.response;
    }

    const project = projectResult.data.project;

    // Create project-aware devlog service
    const devlogService = DevlogService.getInstance(project.id);

    // Get the note
    const note = await devlogService.getNote(noteId);
    if (!note) {
      return ApiErrors.noteNotFound();
    }

    return createSuccessResponse(note);
  } catch (error) {
    console.error('Error getting note:', error);
    return ApiErrors.internalError('Failed to get note');
  }
}

// PUT /api/projects/[name]/devlog/[id]/notes/[noteId] - Update specific note
export async function PUT(
  request: NextRequest,
  { params }: { params: { name: string; devlogId: string; noteId: string } },
) {
  try {
    // Parse and validate parameters
    const paramResult = RouteParams.parseProjectNameAndDevlogId(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectName, devlogId } = paramResult.data;
    const { noteId } = params;

    // Validate request body
    const data = await request.json();
    const validationResult = UpdateNoteBodySchema.safeParse(data);
    if (!validationResult.success) {
      return ApiErrors.invalidRequest(validationResult.error.errors[0].message);
    }

    const updates = validationResult.data;

    // Get project using helper
    const projectResult = await ServiceHelper.getProjectByNameOrFail(projectName);
    if (!projectResult.success) {
      return projectResult.response;
    }

    const project = projectResult.data.project;

    // Create project-aware devlog service
    const devlogService = DevlogService.getInstance(project.id);

    // Update the note
    const updatedNote = await devlogService.updateNote(noteId, {
      ...updates,
      category: updates.category as DevlogNoteCategory | undefined,
    });

    return createSuccessResponse(updatedNote, {
      sseEventType: RealtimeEventType.DEVLOG_NOTE_UPDATED,
    });
  } catch (error) {
    console.error('Error updating note:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return ApiErrors.noteNotFound();
    }
    return ApiErrors.internalError('Failed to update note');
  }
}

// DELETE /api/projects/[name]/devlog/[id]/notes/[noteId] - Delete specific note
export async function DELETE(
  request: NextRequest,
  { params }: { params: { name: string; devlogId: string; noteId: string } },
) {
  try {
    // Parse and validate parameters
    const paramResult = RouteParams.parseProjectNameAndDevlogId(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectName, devlogId } = paramResult.data;
    const { noteId } = params;

    // Get project using helper
    const projectResult = await ServiceHelper.getProjectByNameOrFail(projectName);
    if (!projectResult.success) {
      return projectResult.response;
    }

    const project = projectResult.data.project;

    // Create project-aware devlog service
    const devlogService = DevlogService.getInstance(project.id);

    // Delete the note
    await devlogService.deleteNote(noteId);

    return createSuccessResponse(
      {
        deleted: true,
        devlogId,
        noteId,
      },
      { sseEventType: RealtimeEventType.DEVLOG_NOTE_DELETED },
    );
  } catch (error) {
    console.error('Error deleting note:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return ApiErrors.noteNotFound();
    }
    return ApiErrors.internalError('Failed to delete note');
  }
}
