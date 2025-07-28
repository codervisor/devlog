import { NextRequest, NextResponse } from 'next/server';
import { DevlogService, ProjectService } from '@codervisor/devlog-core';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects/[id]/devlogs/stats/overview - Get overview statistics
export async function GET(request: NextRequest, { params }: { params: { id: number } }) {
  try {
    const projectService = ProjectService.getInstance();
    await projectService.initialize();
    const project = await projectService.get(params.id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const devlogService = DevlogService.getInstance(params.id);
    const stats = await devlogService.getStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching devlog stats:', error);
    return NextResponse.json({ error: 'Failed to fetch devlog statistics' }, { status: 500 });
  }
}
