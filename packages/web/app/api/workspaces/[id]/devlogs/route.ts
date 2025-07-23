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

// GET /api/workspaces/[id]/devlogs - List devlogs from specific workspace
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const manager = await getWorkspaceManager();
        const workspaceId = params.id;

        const { searchParams } = new URL(request.url);
        const filter: any = {};

        // Parse query parameters (same as main devlogs API)
        if (searchParams.get('status')) filter.status = searchParams.get('status')?.split(',');
        if (searchParams.get('type')) filter.type = searchParams.get('type');
        if (searchParams.get('priority')) filter.priority = searchParams.get('priority');

        // Parse pagination parameters
        const page = searchParams.get('page');
        const limit = searchParams.get('limit');
        const sortBy = searchParams.get('sortBy');
        const sortOrder = searchParams.get('sortOrder');

        if (page || limit || sortBy) {
            filter.pagination = {
                page: page ? parseInt(page, 10) : undefined,
                limit: limit ? parseInt(limit, 10) : undefined,
                sortBy: sortBy as any,
                sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
            };
        }

        const devlogs = await manager.listDevlogsFromWorkspace(workspaceId, filter);

        return NextResponse.json(devlogs);
    } catch (error) {
        console.error('Error fetching workspace devlogs:', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch workspace devlogs';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// POST /api/workspaces/[id]/devlogs - Create devlog in specific workspace
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const manager = await getWorkspaceManager();
        const workspaceId = params.id;
        
        // Switch to the target workspace first
        await manager.switchToWorkspace(workspaceId);
        
        const body = await request.json();
        const devlog = await manager.createDevlog(body);

        return NextResponse.json(devlog);
    } catch (error) {
        console.error('Error creating workspace devlog:', error);
        const message = error instanceof Error ? error.message : 'Failed to create devlog';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
