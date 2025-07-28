import { NextRequest, NextResponse } from 'next/server';
import { getProjectManager } from '../../../../../../lib/project-manager';
import { createDevlogService } from '../../../../../../lib/devlog-service';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// POST /api/projects/[id]/devlogs/batch/note - Batch add notes to devlog entries
export async function POST(request: NextRequest, { params }: { params: { id: number } }) {
  try {
    const projectManager = await getProjectManager();
    const project = await projectManager.get(params.id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { ids, note } = await request.json();

    if (!Array.isArray(ids) || !note || typeof note !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request: ids (array) and note (object) are required' },
        { status: 400 },
      );
    }

    // Create project-aware devlog service
    const devlogService = await createDevlogService({
      projectId: params.id,
      project,
    });

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

        // Add the note to the entry's notes array
        const updatedEntry = {
          ...existingEntry,
          notes: [
            ...(existingEntry.notes || []),
            {
              ...note,
              createdAt: new Date().toISOString(),
              devlogId: devlogId,
            },
          ],
          updatedAt: new Date().toISOString(),
        };

        await devlogService.save(updatedEntry);
        updatedEntries.push(updatedEntry);
      } catch (error) {
        errors.push({
          id,
          error: error instanceof Error ? error.message : 'Note addition failed',
        });
      }
    }

    await devlogService.dispose();

    return NextResponse.json({
      success: true,
      updated: updatedEntries,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error batch adding notes to devlogs:', error);
    const message = error instanceof Error ? error.message : 'Failed to batch add notes to devlogs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
