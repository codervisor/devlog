import { NextRequest, NextResponse } from 'next/server';
import { getSharedWorkspaceManager } from '@/lib/shared-workspace-manager';
import { DefaultChatImportService } from '@devlog/ai';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

/**
 * POST /api/workspaces/[id]/chat/import
 *
 * Import chat history from various sources (GitHub Copilot, etc.)
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const manager = await getSharedWorkspaceManager();
    const workspaceId = params.id;

    // Parse request body
    const body = await request.json();
    const {
      source = 'codehist',
      autoLink = true,
      autoLinkThreshold = 0.8,
      includeArchived = false,
      overwriteExisting = false,
      background = true,
      dateRange,
    } = body;

    // Get storage provider for this workspace
    const storageProvider = await manager.getWorkspaceStorageProvider(workspaceId);

    // Create chat import service
    const importService = new DefaultChatImportService(storageProvider);

    // Configure import
    const importConfig = {
      source,
      autoLink,
      autoLinkThreshold,
      sourceConfig: {
        includeArchived,
        overwriteExisting,
        background,
        dateRange,
      },
    };

    console.log(
      `[ChatAPI] Starting import for workspace ${workspaceId} with config:`,
      importConfig,
    );

    // Start import
    const progress = await importService.importFromCodehist(importConfig);

    return NextResponse.json({
      success: true,
      importId: progress.importId,
      status: progress.status,
      progress: progress.progress,
      message: `Chat import started for workspace ${workspaceId}`,
    });
  } catch (error) {
    console.error('[ChatAPI] Import error:', error);
    const message = error instanceof Error ? error.message : 'Failed to start chat import';
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

    // Create chat import service
    const importService = new DefaultChatImportService(storageProvider);

    // Get import progress
    const progress = await importService.getImportProgress(importId);

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
