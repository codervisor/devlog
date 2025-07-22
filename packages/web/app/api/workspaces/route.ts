import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceManager, getStorageInfo } from '../../../lib/workspace-manager';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/workspaces - List all workspaces
export async function GET(request: NextRequest) {
    try {
        const manager = await getWorkspaceManager();
        const workspaces = await manager.listWorkspaces();
        const currentWorkspace = await manager.getCurrentWorkspace();
        const storageInfo = await getStorageInfo();

        return NextResponse.json({
            workspaces,
            currentWorkspace,
            storageInfo, // Include storage type information for debugging
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
