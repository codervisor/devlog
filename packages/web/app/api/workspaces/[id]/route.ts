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

// GET /api/workspaces/[id] - Get workspace details
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const manager = await getWorkspaceManager();
        const workspaceId = params.id;

        if (workspaceId === 'current') {
            const currentWorkspace = await manager.getCurrentWorkspace();
            if (!currentWorkspace) {
                return NextResponse.json({ error: 'No current workspace' }, { status: 404 });
            }
            return NextResponse.json(currentWorkspace);
        }

        const workspaces = await manager.listWorkspaces();
        const workspace = workspaces.find(w => w.id === workspaceId);

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
        }

        const storage = await manager.getWorkspaceStorage(workspaceId);
        const connectionStatus = await manager.testWorkspaceConnection(workspaceId);

        return NextResponse.json({
            workspace,
            storage,
            connectionStatus,
        });
    } catch (error) {
        console.error('Error fetching workspace:', error);
        return NextResponse.json({ error: 'Failed to fetch workspace' }, { status: 500 });
    }
}

// PUT /api/workspaces/[id]/switch - Switch to workspace
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const manager = await getWorkspaceManager();
        const workspaceId = params.id;

        const context = await manager.switchToWorkspace(workspaceId);

        return NextResponse.json({
            message: `Switched to workspace: ${context.workspace.name}`,
            workspace: context,
        });
    } catch (error) {
        console.error('Error switching workspace:', error);
        const message = error instanceof Error ? error.message : 'Failed to switch workspace';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// DELETE /api/workspaces/[id] - Delete workspace
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const manager = await getWorkspaceManager();
        const workspaceId = params.id;

        await manager.deleteWorkspace(workspaceId);

        return NextResponse.json({
            message: `Workspace '${workspaceId}' deleted successfully`,
        });
    } catch (error) {
        console.error('Error deleting workspace:', error);
        const message = error instanceof Error ? error.message : 'Failed to delete workspace';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
