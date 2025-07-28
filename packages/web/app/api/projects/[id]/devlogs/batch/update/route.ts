import { NextRequest, NextResponse } from 'next/server';
import { DevlogService, ProjectService } from '@codervisor/devlog-core';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// POST /api/projects/[id]/devlogs/batch/update - Batch update devlog entries
export async function POST(request: NextRequest, { params }: { params: { id: number } }) {
  try {
    const projectService = ProjectService.getInstance();
    await projectService.initialize();
    const project = await projectService.get(params.id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { ids, updates } = await request.json();

    if (!Array.isArray(ids) || !updates) {
      return NextResponse.json(
        { error: 'Invalid request: ids (array) and updates (object) are required' },
        { status: 400 },
      );
    }

    const devlogService = DevlogService.getInstance(params.id);

    const updatedEntries = [];
    const errors = [];

    // Process each ID
    for (const id of ids) {
      try {
        const devlogId = parseInt(id);
        const existingEntry = await devlogService.get(devlogId);

        if (!existingEntry) {
          errors.push({ id, error: 'Entry not found' });
          continue;
        }

        const updatedEntry = {
          ...existingEntry,
          ...updates,
          id: devlogId,
          projectId: params.id, // Ensure project context is maintained
          updatedAt: new Date().toISOString(),
        };

        await devlogService.save(updatedEntry);
        updatedEntries.push(updatedEntry);
      } catch (error) {
        errors.push({
          id,
          error: error instanceof Error ? error.message : 'Update failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      updated: updatedEntries,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error batch updating devlogs:', error);
    const message = error instanceof Error ? error.message : 'Failed to batch update devlogs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
