import { NextRequest, NextResponse } from 'next/server';
import { getProjectManager } from '../../../../../../lib/project-manager';
import { createDevlogService } from '../../../../../../lib/devlog-service';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// POST /api/projects/[id]/devlogs/batch/delete - Batch delete devlog entries
export async function POST(request: NextRequest, { params }: { params: { id: number } }) {
  try {
    const projectManager = await getProjectManager();
    const project = await projectManager.get(params.id);

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

    // Create project-aware devlog service
    const devlogService = await createDevlogService({
      projectId: params.id,
      project,
    });

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

    await devlogService.dispose();

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
