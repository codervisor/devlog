import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceManager } from '../../../../lib/workspace-manager';
import { broadcastUpdate } from '../../../../lib/sse-manager';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// PUT /api/workspaces/[id]/switch - Switch to workspace
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const manager = await getWorkspaceManager();
    const workspaceId = params.id;

    const context = await manager.switchToWorkspace(workspaceId);

    // Broadcast workspace switch event to all connected clients
    broadcastUpdate('workspace-switched', {
      workspaceId: context.workspaceId,
      workspace: context.workspace,
      isDefault: context.isDefault,
    });

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
