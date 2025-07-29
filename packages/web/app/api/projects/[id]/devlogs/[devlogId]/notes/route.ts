import { NextRequest, NextResponse } from 'next/server';
import { DevlogService, ProjectService } from '@codervisor/devlog-core';
import { RouteParams, ApiErrors } from '@/lib/api-utils';
import { z } from 'zod';
import type { NoteCategory } from '@codervisor/devlog-core';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// Schema for adding notes
const AddNoteBodySchema = z.object({
  note: z.string().min(1, 'Note is required'),
  category: z.string().optional().default('progress'),
  files: z.array(z.string()).optional(),
  codeChanges: z.string().optional(),
});

// Schema for updating devlog with note
const UpdateWithNoteBodySchema = z.object({
  note: z.string().min(1, 'Note is required'),
  category: z.string().optional().default('progress'),
  files: z.array(z.string()).optional(),
  codeChanges: z.string().optional(),
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

    const { note, category, files, codeChanges } = validationResult.data;

    // Ensure project exists
    const projectService = ProjectService.getInstance();
    const project = await projectService.get(projectId);
    if (!project) {
      return ApiErrors.projectNotFound();
    }

    // Create project-aware devlog service
    const devlogService = DevlogService.getInstance(projectId);

    // Get the existing devlog entry
    const existingEntry = await devlogService.get(devlogId);
    if (!existingEntry) {
      return ApiErrors.devlogNotFound();
    }

    // Create the new note
    const newNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: note,
      category: (category || 'progress') as NoteCategory,
      timestamp: new Date().toISOString(),
      files: files || [],
      codeChanges: codeChanges || undefined,
    };

    // Add the note to the entry's notes array and save
    const updatedEntry = {
      ...existingEntry,
      notes: [...(existingEntry.notes || []), newNote],
      updatedAt: new Date().toISOString(),
    };

    await devlogService.save(updatedEntry);

    return NextResponse.json(updatedEntry);
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

    const { note, category, files, codeChanges, ...updateFields } = validationResult.data;

    // Ensure project exists
    const projectService = ProjectService.getInstance();
    const project = await projectService.get(projectId);
    if (!project) {
      return ApiErrors.projectNotFound();
    }

    // Create project-aware devlog service
    const devlogService = DevlogService.getInstance(projectId);

    // Get the existing devlog entry
    const existingEntry = await devlogService.get(devlogId);
    if (!existingEntry) {
      return ApiErrors.devlogNotFound();
    }

    // Create the new note
    const newNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: note,
      category: (category || 'progress') as NoteCategory,
      timestamp: new Date().toISOString(),
      files: files || [],
      codeChanges: codeChanges || undefined,
    };

    // Prepare the update data with both the note and any field updates
    const updatedEntry = {
      ...existingEntry,
      ...updateFields,
      notes: [...(existingEntry.notes || []), newNote],
      updatedAt: new Date().toISOString(),
    };

    // Save the updated entry
    await devlogService.save(updatedEntry);

    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error('Error updating devlog with note:', error);
    return ApiErrors.internalError('Failed to update devlog entry with note');
  }
}
