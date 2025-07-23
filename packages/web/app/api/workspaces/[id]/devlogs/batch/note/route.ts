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

// POST /api/workspaces/[id]/devlogs/batch/note - Batch add notes to devlogs in specific workspace
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const manager = await getWorkspaceManager();
        const workspaceId = params.id;
        
        const body = await request.json();
        const { ids, content, category = 'progress', files, codeChanges } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { error: 'Invalid or missing ids array' },
                { status: 400 }
            );
        }

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return NextResponse.json(
                { error: 'Invalid or missing content' },
                { status: 400 }
            );
        }

        // Switch to the target workspace and batch add notes
        await manager.switchToWorkspace(workspaceId);
        
        // Batch add notes using individual operations (WorkspaceDevlogManager doesn't have batchAddNote yet)
        const results = [];
        const errors = [];
        
        for (const id of ids) {
            try {
                // Get existing devlog
                const existing = await manager.getDevlog(id);
                if (!existing) {
                    errors.push({ id, error: 'Devlog not found' });
                    continue;
                }
                
                // Add note to existing notes
                const newNote = {
                    content: content.trim(),
                    category,
                    timestamp: new Date(),
                    ...(files && { files }),
                    ...(codeChanges && { codeChanges }),
                };
                
                const updatedNotes = [...(existing.notes || []), newNote];
                
                // Update devlog with new note
                const result = await manager.updateDevlog(id, { 
                    notes: updatedNotes,
                    updatedAt: new Date() 
                });
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
        console.error('Workspace batch add note error:', error);
        const message = error instanceof Error ? error.message : 'Failed to batch add notes';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
