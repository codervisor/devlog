import { NextRequest, NextResponse } from 'next/server';
import { WorkspaceDevlogManager } from '@devlog/core';
import { join } from 'path';
import { homedir } from 'os';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

let workspaceManager: WorkspaceDevlogManager | null = null;

async function getWorkspaceManager(): Promise<WorkspaceDevlogManager> {
    if (!workspaceManager) {
        workspaceManager = new WorkspaceDevlogManager({
            workspaceConfigPath: join(homedir(), '.devlog', 'workspaces.json'),
            createWorkspaceConfigIfMissing: true,
            fallbackToEnvConfig: true,
        });
        await workspaceManager.initialize();
    }
    return workspaceManager;
}

// GET /api/workspaces/[id]/devlogs/stats/timeseries - Get time series statistics for dashboard charts from specific workspace
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const manager = await getWorkspaceManager();
        const workspaceId = params.id;
        
        // Parse query parameters from NextRequest
        const days = request.nextUrl.searchParams.get('days') ? parseInt(request.nextUrl.searchParams.get('days')!) : undefined;
        const from = request.nextUrl.searchParams.get('from') || undefined;
        const to = request.nextUrl.searchParams.get('to') || undefined;

        const timeSeriesRequest = {
            ...(days && { days }),
            ...(from && { from }),
            ...(to && { to }),
        };

        // Switch to the target workspace and get time series stats
        await manager.switchToWorkspace(workspaceId);
        const timeSeriesStats = await manager.getTimeSeriesStats(timeSeriesRequest);

        return NextResponse.json(timeSeriesStats);
    } catch (error) {
        console.error('Error fetching workspace time series stats:', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch workspace time series stats';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
