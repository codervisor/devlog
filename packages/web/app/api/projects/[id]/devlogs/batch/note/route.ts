import { NextRequest, NextResponse } from 'next/server';
import { getProjectManager, getAppStorageConfig } from '../../../../../../lib/project-manager';
import { ProjectDevlogManager } from '@codervisor/devlog-core';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// POST /api/projects/[id]/devlogs/batch/note - Batch add notes to devlog entries
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const projectManager = await getProjectManager();
    const project = await projectManager.getProject(params.id);

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

    // Get centralized storage config
    const storageConfig = await getAppStorageConfig();

    // Check if we got an error response
    if ('status' in storageConfig && storageConfig.status === 'error') {
      return NextResponse.json({ error: 'Storage configuration error' }, { status: 500 });
    }

    // Create project-aware devlog manager
    const devlogManager = new ProjectDevlogManager({
      storageConfig: storageConfig as any, // Type assertion after error check
      projectContext: {
        projectId: params.id,
        project,
        isDefault: params.id === 'default',
      },
    });

    await devlogManager.initialize();

    const updatedEntries = [];
    const errors = [];

    // Process each ID
    for (const id of ids) {
      try {
        const devlogId = parseInt(id);
        const existingEntry = await devlogManager.get(devlogId);

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

        await devlogManager.save(updatedEntry);
        updatedEntries.push(updatedEntry);
      } catch (error) {
        errors.push({
          id,
          error: error instanceof Error ? error.message : 'Note addition failed',
        });
      }
    }

    await devlogManager.dispose();

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
