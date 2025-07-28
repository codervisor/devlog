import { NextRequest, NextResponse } from 'next/server';
import { DevlogService, ProjectService } from '@codervisor/devlog-core';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects/[id]/devlogs/stats/timeseries - Get time series statistics
export async function GET(request: NextRequest, { params }: { params: { id: number } }) {
  try {
    const projectService = ProjectService.getInstance();
    await projectService.initialize();
    const project = await projectService.get(params.id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const days = parseInt(searchParams.get('days') || '30');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const timeSeriesRequest = {
      days,
      ...(from && { from }),
      ...(to && { to }),
      projectId: params.id,
    };

    const devlogService = DevlogService.getInstance(params.id);
    const stats = await devlogService.getTimeSeriesStats(params.id, timeSeriesRequest);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching devlog time series stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devlog time series statistics' },
      { status: 500 },
    );
  }
}
