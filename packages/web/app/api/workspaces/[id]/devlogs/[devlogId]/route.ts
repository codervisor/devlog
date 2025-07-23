import { NextRequest, NextResponse } from 'next/server';
import { getSharedWorkspaceManager } from '@/lib/shared-workspace-manager';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/workspaces/[id]/devlogs/[devlogId] - Get devlog by ID from specific workspace
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string; devlogId: string } }
) {
    try {
        const manager = await getSharedWorkspaceManager();
        const workspaceId = params.id;
        const devlogId = parseInt(params.devlogId, 10);
        
        // Switch to the target workspace first
        await manager.switchToWorkspace(workspaceId);
        
        const devlog = await manager.getDevlog(devlogId);
        
        if (!devlog) {
            return NextResponse.json({ error: 'Devlog not found' }, { status: 404 });
        }

        return NextResponse.json(devlog);
    } catch (error) {
        console.error('Error fetching workspace devlog:', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch devlog';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// PUT /api/workspaces/[id]/devlogs/[devlogId] - Update devlog in specific workspace
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string; devlogId: string } }
) {
    try {
        const manager = await getSharedWorkspaceManager();
        const workspaceId = params.id;
        const devlogId = parseInt(params.devlogId, 10);
        
        // Switch to the target workspace first
        await manager.switchToWorkspace(workspaceId);
        
        const body = await request.json();
        const devlog = await manager.updateDevlog(devlogId, body);

        return NextResponse.json(devlog);
    } catch (error) {
        console.error('Error updating workspace devlog:', error);
        const message = error instanceof Error ? error.message : 'Failed to update devlog';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// DELETE /api/workspaces/[id]/devlogs/[devlogId] - Delete devlog from specific workspace
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string; devlogId: string } }
) {
    try {
        const manager = await getSharedWorkspaceManager();
        const workspaceId = params.id;
        const devlogId = parseInt(params.devlogId, 10);
        
        // Switch to the target workspace first
        await manager.switchToWorkspace(workspaceId);
        
        await manager.deleteDevlog(devlogId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting workspace devlog:', error);
        const message = error instanceof Error ? error.message : 'Failed to delete devlog';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
