import { NextRequest, NextResponse } from 'next/server';
import { getSharedWorkspaceManager } from '@/lib/shared-workspace-manager';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// POST /api/workspaces/[id]/devlogs/batch/delete - Batch archive devlogs in specific workspace (soft delete)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const manager = await getSharedWorkspaceManager();
    const workspaceId = params.id;

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid or missing ids array' }, { status: 400 });
    }

    // Switch to the target workspace and batch delete
    await manager.switchToWorkspace(workspaceId);

    // Batch archive using individual operations (WorkspaceDevlogManager doesn't have batchDelete yet)
    const errors = [];
    let deletedCount = 0;

    for (const id of ids) {
      try {
        await manager.deleteDevlog(id);
        deletedCount++;
      } catch (error) {
        errors.push({ id, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    const response = {
      totalProcessed: ids.length,
      successCount: deletedCount,
      errorCount: errors.length,
      failed: errors,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Workspace batch delete error:', error);
    const message = error instanceof Error ? error.message : 'Failed to batch delete devlogs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
