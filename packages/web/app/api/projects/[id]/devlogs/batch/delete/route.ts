import { NextRequest, NextResponse } from 'next/server';
import { DevlogService, ProjectService } from '@codervisor/devlog-core';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// POST /api/projects/[id]/devlogs/batch/delete - Batch delete devlog entries
export async function POST(request: NextRequest, { params }: { params: { id: number } }) {
  try {
    const projectService = ProjectService.getInstance();

    const project = await projectService.get(params.id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: ids (non-empty array) is required' },
        { status: 400 },
      );
    }

    const devlogService = DevlogService.getInstance(params.id);

    const deletedIds = [];
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

        await devlogService.delete(devlogId);
        deletedIds.push(devlogId);
      } catch (error) {
        errors.push({
          id,
          error: error instanceof Error ? error.message : 'Delete failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      deleted: deletedIds,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error batch deleting devlogs:', error);
    const message = error instanceof Error ? error.message : 'Failed to batch delete devlogs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
