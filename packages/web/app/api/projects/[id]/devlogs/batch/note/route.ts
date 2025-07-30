import { NextRequest, NextResponse } from 'next/server';
import {
  RouteParams,
  ServiceHelper,
  ApiErrors,
  ApiResponses,
  withErrorHandling,
} from '@/lib/api-utils';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// POST /api/projects/[id]/devlogs/batch/note - Batch add notes to devlog entries
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
    const { ids, note } = await request.json();

    if (!Array.isArray(ids) || !note || typeof note !== 'object') {
      return ApiErrors.invalidRequest('ids (array) and note (object) are required');
    }

    // Get devlog service
    const devlogService = await ServiceHelper.getDevlogService(projectId);

    const updatedEntries = [];
    const errors = [];

    // Process each ID using the new addNote method
    for (const id of ids) {
      try {
        const devlogId = parseInt(id);
        if (isNaN(devlogId)) {
          errors.push({ id, error: 'Invalid devlog ID' });
          continue;
        }

        // Add note directly using DevlogService.addNote()
        const newNote = await devlogService.addNote(devlogId, {
          content: note.content,
          category: note.category || 'progress',
          files: note.files || [],
          codeChanges: note.codeChanges || undefined,
        });

        // Get the updated entry for response
        const updatedEntry = await devlogService.get(devlogId, true);
        if (updatedEntry) {
          updatedEntries.push(updatedEntry);
        }
      } catch (error) {
        errors.push({
          id,
          error: error instanceof Error ? error.message : 'Note addition failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      updated: updatedEntries,
      errors: errors.length > 0 ? errors : undefined,
    });
  },
);
