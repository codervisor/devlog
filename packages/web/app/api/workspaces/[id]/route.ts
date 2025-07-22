import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceManager } from '../../../lib/workspace-manager';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/workspaces/[id] - Get workspace details
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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
    const workspace = workspaces.find((w) => w.id === workspaceId);

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const storage = await manager.getWorkspaceStorage(workspaceId);

    // For connection status, we'll return a simplified status
    // since AutoWorkspaceManager doesn't have testWorkspaceConnection
    const connectionStatus = { connected: true };

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

// PUT /api/workspaces/[id] - Update workspace configuration
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const manager = await getWorkspaceManager();
    const workspaceId = params.id;
    const body = await request.json();

    // TODO: Implement workspace configuration update
    // This should update workspace metadata like name, description, settings, etc.

    return NextResponse.json(
      {
        error: 'Workspace configuration update not yet implemented',
      },
      { status: 501 },
    );
  } catch (error) {
    console.error('Error updating workspace:', error);
    const message = error instanceof Error ? error.message : 'Failed to update workspace';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/workspaces/[id] - Delete workspace
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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
