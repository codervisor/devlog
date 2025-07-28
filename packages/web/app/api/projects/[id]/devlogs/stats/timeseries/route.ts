import { NextRequest, NextResponse } from 'next/server';
import { getProjectManager } from '../../../../../../lib/project-manager';
import { createDevlogService } from '../../../../../../lib/devlog-service';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects/[id]/devlogs/stats/timeseries - Get time series statistics
export async function GET(request: NextRequest, { params }: { params: { id: number } }) {
  try {
    const projectManager = await getProjectManager();
    const project = await projectManager.get(params.id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const days = parseInt(searchParams.get('days') || '30');
    const granularity = searchParams.get('granularity') || 'day';

    const timeSeriesRequest = {
      days,
      granularity: granularity as 'day' | 'week' | 'month',
    };

    // Create project-aware devlog service
    const devlogService = await createDevlogService({
      projectId: params.id,
      project,
    });

    const stats = await devlogService.getTimeSeriesStats(timeSeriesRequest);

    await devlogService.dispose();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching devlog time series stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devlog time series statistics' },
      { status: 500 },
    );
  }
}
