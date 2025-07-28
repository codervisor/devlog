import { NextRequest, NextResponse } from 'next/server';
import { getProjectManager, getAppStorageConfig } from '../../../../../../lib/project-manager';
import { ProjectDevlogManager } from '@codervisor/devlog-core';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects/[id]/devlogs/stats/overview - Get overview statistics
export async function GET(request: NextRequest, { params }: { params: { id: number } }) {
  try {
    const projectManager = await getProjectManager();
    const project = await projectManager.getProject(params.id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
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

    const stats = await devlogManager.getStats();

    await devlogManager.dispose();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching devlog stats:', error);
    return NextResponse.json({ error: 'Failed to fetch devlog statistics' }, { status: 500 });
  }
}
