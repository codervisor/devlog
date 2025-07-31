import { NextRequest, NextResponse } from 'next/server';
import { DevlogService, ProjectService } from '@codervisor/devlog-core';
import { RouteParams, ApiErrors, createSuccessResponse, ResponseTransformer } from '@/lib';
import { NoteSSE, DevlogSSE } from '@/lib/api/sse-utils';
import { z } from 'zod';
import type { NoteCategory } from '@codervisor/devlog-core';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects/[id]/devlogs/[devlogId]/notes - List notes for a devlog entry
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const category = searchParams.get('category');

    // Validate limit if provided
    if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 1000)) {
      return ApiErrors.invalidRequest('Limit must be a number between 1 and 1000');
    }

    // Ensure project exists
    const projectService = ProjectService.getInstance();
    const project = await projectService.get(projectId);
    if (!project) {
      return ApiErrors.projectNotFound();
    }

    // Create project-aware devlog service
    const devlogService = DevlogService.getInstance(projectId);

    // Verify devlog exists
    const devlogEntry = await devlogService.get(devlogId, false); // Don't load notes yet
    if (!devlogEntry) {
      return ApiErrors.devlogNotFound();
    }

    // Get notes for this devlog
    const notes = await devlogService.getNotes(devlogId, limit);

    // Filter by category if specified
    const filteredNotes = category ? notes.filter((note) => note.category === category) : notes;

    const notesData = {
      devlogId,
      total: filteredNotes.length,
      notes: filteredNotes,
    };

    return createSuccessResponse(notesData);
  } catch (error) {
    console.error('Error listing devlog notes:', error);
    return ApiErrors.internalError('Failed to list notes for devlog entry');
  }
}

// Schema for adding notes
const AddNoteBodySchema = z.object({
  note: z.string().min(1, 'Note is required'),
  category: z.string().optional().default('progress'),
});

// Schema for updating devlog with note
const UpdateWithNoteBodySchema = z.object({
  note: z.string().min(1, 'Note is required'),
  category: z.string().optional().default('progress'),
  // Optional update fields
  status: z
    .enum(['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'])
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignee: z.string().nullable().optional(),
  businessContext: z.string().nullable().optional(),
  technicalContext: z.string().nullable().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
});

// POST /api/projects/[id]/devlogs/[devlogId]/notes - Add note to devlog entry
export async function POST(
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

    // Validate request body
    const data = await request.json();
    const validationResult = AddNoteBodySchema.safeParse(data);
    if (!validationResult.success) {
      return ApiErrors.invalidRequest(validationResult.error.errors[0].message);
    }

    const { note, category } = validationResult.data;

    // Ensure project exists
    const projectService = ProjectService.getInstance();
    const project = await projectService.get(projectId);
    if (!project) {
      return ApiErrors.projectNotFound();
    }

    // Create project-aware devlog service
    const devlogService = DevlogService.getInstance(projectId);

    // Add the note directly using the new addNote method
    const newNote = await devlogService.addNote(devlogId, {
      content: note,
      category: (category || 'progress') as NoteCategory,
    });

    return NoteSSE.created(createSuccessResponse(newNote, { status: 201 }));
  } catch (error) {
    console.error('Error adding devlog note:', error);
    return ApiErrors.internalError('Failed to add note to devlog entry');
  }
}

// PUT /api/projects/[id]/devlogs/[devlogId]/notes - Update devlog and add note in one operation
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

    // Validate request body
    const data = await request.json();
    const validationResult = UpdateWithNoteBodySchema.safeParse(data);
    if (!validationResult.success) {
      return ApiErrors.invalidRequest(validationResult.error.errors[0].message);
    }

    const { note, category, ...updateFields } = validationResult.data;

    // Ensure project exists
    const projectService = ProjectService.getInstance();
    const project = await projectService.get(projectId);
    if (!project) {
      return ApiErrors.projectNotFound();
    }

    // Create project-aware devlog service
    const devlogService = DevlogService.getInstance(projectId);

    // Get the existing devlog entry
    const existingEntry = await devlogService.get(devlogId, false); // Don't load notes
    if (!existingEntry) {
      return ApiErrors.devlogNotFound();
    }

    // Update devlog fields if provided
    if (Object.keys(updateFields).length > 0) {
      const updatedEntry = {
        ...existingEntry,
        ...updateFields,
        updatedAt: new Date().toISOString(),
      };
      await devlogService.save(updatedEntry);
    }

    // Add the note using the dedicated method
    const newNote = await devlogService.addNote(devlogId, {
      content: note,
      category: (category || 'progress') as NoteCategory,
    });

    // Return the updated entry with the note
    const finalEntry = await devlogService.get(devlogId, true); // Load with notes
    const transformedEntry = ResponseTransformer.transformDevlog(finalEntry);
    return DevlogSSE.updated(createSuccessResponse(transformedEntry));
  } catch (error) {
    console.error('Error updating devlog with note:', error);
    return ApiErrors.internalError('Failed to update devlog entry with note');
  }
}
