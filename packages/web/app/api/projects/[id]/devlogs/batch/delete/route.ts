import { NextRequest, NextResponse } from 'next/server';
import { getProjectManager, getAppStorageConfig } from '../../../../../../lib/project-manager';
import { ProjectDevlogManager } from '@codervisor/devlog-core';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// POST /api/projects/[id]/devlogs/batch/delete - Batch delete devlog entries
export async function POST(request: NextRequest, { params }: { params: { id: number } }) {
  try {
    const projectManager = await getProjectManager();
    const project = await projectManager.getProject(params.id);

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
      },
    });

    await devlogManager.initialize();

    const deletedIds = [];
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

        await devlogManager.delete(devlogId);
        deletedIds.push(devlogId);
      } catch (error) {
        errors.push({
          id,
          error: error instanceof Error ? error.message : 'Delete failed',
        });
      }
    }

    await devlogManager.dispose();

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
