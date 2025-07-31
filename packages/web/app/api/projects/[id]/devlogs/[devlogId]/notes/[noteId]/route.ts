import { NextRequest, NextResponse } from 'next/server';
import { DevlogService, ProjectService } from '@codervisor/devlog-core';
import { RouteParams, ApiErrors, createSuccessResponse } from '@/lib';
import { NoteSSE } from '@/lib/api/sse-utils';
import { z } from 'zod';
import type { NoteCategory } from '@codervisor/devlog-core';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// Schema for updating notes
const UpdateNoteBodySchema = z.object({
  content: z.string().min(1, 'Note content is required').optional(),
  category: z.string().optional(),
});

// GET /api/projects/[id]/devlogs/[devlogId]/notes/[noteId] - Get specific note
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; devlogId: string; noteId: string } },
) {
  try {
    // Parse and validate parameters
    const paramResult = RouteParams.parseProjectAndDevlogId(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectId } = paramResult.data;
    const { noteId } = params;

    // Ensure project exists
    const projectService = ProjectService.getInstance();
    const project = await projectService.get(projectId);
    if (!project) {
      return ApiErrors.projectNotFound();
    }

    // Create project-aware devlog service
    const devlogService = DevlogService.getInstance(projectId);

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

// PUT /api/projects/[id]/devlogs/[devlogId]/notes/[noteId] - Update specific note
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; devlogId: string; noteId: string } },
) {
  try {
    // Parse and validate parameters
    const paramResult = RouteParams.parseProjectAndDevlogId(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectId } = paramResult.data;
    const { noteId } = params;

    // Validate request body
    const data = await request.json();
    const validationResult = UpdateNoteBodySchema.safeParse(data);
    if (!validationResult.success) {
      return ApiErrors.invalidRequest(validationResult.error.errors[0].message);
    }

    const updates = validationResult.data;

    // Ensure project exists
    const projectService = ProjectService.getInstance();
    const project = await projectService.get(projectId);
    if (!project) {
      return ApiErrors.projectNotFound();
    }

    // Create project-aware devlog service
    const devlogService = DevlogService.getInstance(projectId);

    // Update the note
    const updatedNote = await devlogService.updateNote(noteId, {
      ...updates,
      category: updates.category as NoteCategory | undefined,
    });

    return NoteSSE.updated(createSuccessResponse(updatedNote));
  } catch (error) {
    console.error('Error updating note:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return ApiErrors.noteNotFound();
    }
    return ApiErrors.internalError('Failed to update note');
  }
}

// DELETE /api/projects/[id]/devlogs/[devlogId]/notes/[noteId] - Delete specific note
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; devlogId: string; noteId: string } },
) {
  try {
    // Parse and validate parameters
    const paramResult = RouteParams.parseProjectAndDevlogId(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectId } = paramResult.data;
    const { noteId, devlogId } = params;

    // Ensure project exists
    const projectService = ProjectService.getInstance();
    const project = await projectService.get(projectId);
    if (!project) {
      return ApiErrors.projectNotFound();
    }

    // Create project-aware devlog service
    const devlogService = DevlogService.getInstance(projectId);

    // Delete the note
    await devlogService.deleteNote(noteId);

    return NoteSSE.deleted(createSuccessResponse({ deleted: true, noteId }), noteId, devlogId);
  } catch (error) {
    console.error('Error deleting note:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return ApiErrors.noteNotFound();
    }
    return ApiErrors.internalError('Failed to delete note');
  }
}
