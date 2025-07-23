import { NextRequest, NextResponse } from 'next/server';
import { getSharedWorkspaceManager } from '@/lib/shared-workspace-manager';

// Mark this route as dynamic to prevent static generation  
export const dynamic = 'force-dynamic';

// GET /api/workspaces/[id]/devlogs/stats/overview - Get devlog statistics for specific workspace
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const manager = await getSharedWorkspaceManager();
        const workspaceId = params.id;

        // Switch to the target workspace and get stats
        await manager.switchToWorkspace(workspaceId);
        const stats = await manager.getStats();

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching workspace stats:', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch workspace stats';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
