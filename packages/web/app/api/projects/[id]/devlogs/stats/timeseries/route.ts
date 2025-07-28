import { NextRequest, NextResponse } from 'next/server';
import { getProjectManager, getAppStorageConfig } from '../../../../../../lib/project-manager';
import { ProjectDevlogManager } from '@codervisor/devlog-core';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects/[id]/devlogs/stats/timeseries - Get time series statistics
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const projectManager = await getProjectManager();
    const project = await projectManager.getProject(params.id);

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

    const stats = await devlogManager.getTimeSeriesStats(timeSeriesRequest);

    await devlogManager.dispose();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching devlog time series stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devlog time series statistics' },
      { status: 500 },
    );
  }
}
