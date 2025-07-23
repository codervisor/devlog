import { NextRequest, NextResponse } from 'next/server';
import { getSharedWorkspaceManager } from '@/lib/shared-workspace-manager';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// POST /api/workspaces/[id]/devlogs/batch/update - Batch update devlogs in specific workspace
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const manager = await getSharedWorkspaceManager();
        const workspaceId = params.id;
        
        const body = await request.json();
        const { ids, updates } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { error: 'Invalid or missing ids array' },
                { status: 400 }
            );
        }

        if (!updates || typeof updates !== 'object') {
            return NextResponse.json(
                { error: 'Invalid or missing updates object' },
                { status: 400 }
            );
        }

        // Switch to the target workspace and batch update
        await manager.switchToWorkspace(workspaceId);
        
        // Batch update using individual operations (WorkspaceDevlogManager doesn't have batchUpdate yet)
        const results = [];
        const errors = [];
        
        for (const id of ids) {
            try {
                const result = await manager.updateDevlog(id, updates);
                results.push(result);
            } catch (error) {
                errors.push({ id, error: error instanceof Error ? error.message : 'Unknown error' });
            }
        }
        
        const response = {
            successful: results,
            failed: errors,
            totalProcessed: ids.length,
            successCount: results.length,
            errorCount: errors.length,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Workspace batch update error:', error);
        const message = error instanceof Error ? error.message : 'Failed to batch update devlogs';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
