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

// GET /api/workspaces - List all workspaces
export async function GET(request: NextRequest) {
    try {
        const manager = await getWorkspaceManager();
        const workspaces = await manager.listWorkspaces();
        const currentWorkspace = await manager.getCurrentWorkspace();

        return NextResponse.json({
            workspaces,
            currentWorkspace,
        });
    } catch (error) {
        console.error('Error fetching workspaces:', error);
        return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
    }
}

// POST /api/workspaces - Create new workspace
export async function POST(request: NextRequest) {
    try {
        const manager = await getWorkspaceManager();
        const data = await request.json();

        const { workspace, storage } = data;

        if (!workspace || !storage) {
            return NextResponse.json(
                { error: 'Both workspace metadata and storage configuration are required' },
                { status: 400 }
            );
        }

        const createdWorkspace = await manager.createWorkspace(workspace, storage);

        return NextResponse.json(createdWorkspace, { status: 201 });
    } catch (error) {
        console.error('Error creating workspace:', error);
        const message = error instanceof Error ? error.message : 'Failed to create workspace';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
