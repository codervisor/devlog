import { NextRequest, NextResponse } from 'next/server';
import { getSharedWorkspaceManager } from '@/lib/shared-workspace-manager';
import { ChatHubService } from '@codervisor/devlog-ai';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

/**
 * POST /api/workspaces/[id]/chat/import
 *
 * Receive and process chat history data from external clients
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const manager = await getSharedWorkspaceManager();
    const workspaceId = params.id;

    // Parse request body - expecting chat data from clients
    const body = await request.json();
    const { sessions = [], messages = [], source = 'github-copilot', workspaceInfo } = body;

    // Validate required data
    if (!Array.isArray(sessions) || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid data format: sessions and messages must be arrays' },
        { status: 400 },
      );
    }

    // Get storage provider for this workspace
    const storageProvider = await manager.getWorkspaceStorageProvider(workspaceId);

    // Create ChatHub service
    const chatHub = new ChatHubService(storageProvider);

    console.log(
      `[ChatAPI] Receiving chat data for workspace ${workspaceId}: ${sessions.length} sessions, ${messages.length} messages from ${source}`,
    );

    // Process the incoming chat data
    const progress = await chatHub.processBulkChatData({
      sessions,
      messages,
      source,
      workspaceInfo,
    });

    return NextResponse.json({
      success: true,
      importId: progress.importId,
      status: progress.status,
      progress: progress.progress,
      message: `Chat data processed for workspace ${workspaceId}`,
    });
  } catch (error) {
    console.error('[ChatAPI] Import error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process chat data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/workspaces/[id]/chat/import?importId=xxx
 *
 * Get import progress status
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const manager = await getSharedWorkspaceManager();
    const workspaceId = params.id;

    const { searchParams } = new URL(request.url);
    const importId = searchParams.get('importId');

    if (!importId) {
      return NextResponse.json({ error: 'importId parameter is required' }, { status: 400 });
    }

    // Get storage provider for this workspace
    const storageProvider = await manager.getWorkspaceStorageProvider(workspaceId);

    // Create ChatHub service
    const chatHub = new ChatHubService(storageProvider);

    // Get import progress
    const progress = await chatHub.getImportProgress(importId);

    if (!progress) {
      return NextResponse.json({ error: `Import '${importId}' not found` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error('[ChatAPI] Get import progress error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get import progress';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
