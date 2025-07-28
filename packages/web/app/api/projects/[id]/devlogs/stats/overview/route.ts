import { NextRequest, NextResponse } from 'next/server';
import { getProjectManager } from '../../../../../../lib/project-manager';
import { createDevlogService } from '../../../../../../lib/devlog-service';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects/[id]/devlogs/stats/overview - Get overview statistics
export async function GET(request: NextRequest, { params }: { params: { id: number } }) {
  try {
    const projectManager = await getProjectManager();
    const project = await projectManager.get(params.id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Create project-aware devlog service
    const devlogService = await createDevlogService({
      projectId: params.id,
      project,
    });

    const stats = await devlogService.getStats();

    await devlogService.dispose();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching devlog stats:', error);
    return NextResponse.json({ error: 'Failed to fetch devlog statistics' }, { status: 500 });
  }
}
