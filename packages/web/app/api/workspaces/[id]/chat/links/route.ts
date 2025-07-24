import { NextRequest, NextResponse } from 'next/server';
import { getSharedWorkspaceManager } from '@/lib/shared-workspace-manager';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

/**
 * GET /api/workspaces/[id]/chat/links
 *
 * Get chat-devlog links with optional filtering
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const manager = await getSharedWorkspaceManager();
    const workspaceId = params.id;

    const { searchParams } = new URL(request.url);

    // Parse filters
    const sessionId = searchParams.get('sessionId');
    const devlogId = searchParams.get('devlogId');

    console.log(`[ChatAPI] Getting chat-devlog links for workspace ${workspaceId}`);

    // Get storage provider for this workspace
    const storageProvider = await manager.getWorkspaceStorageProvider(workspaceId);

    // Get chat-devlog links
    const links = await storageProvider.getChatDevlogLinks(
      sessionId || undefined,
      devlogId ? parseInt(devlogId, 10) : undefined,
    );

    return NextResponse.json({
      success: true,
      links,
      filters: {
        sessionId,
        devlogId: devlogId ? parseInt(devlogId, 10) : undefined,
      },
    });
  } catch (error) {
    console.error('[ChatAPI] Get links error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get chat-devlog links';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/workspaces/[id]/chat/links
 *
 * Create a new chat-devlog link
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const manager = await getSharedWorkspaceManager();
    const workspaceId = params.id;

    // Parse request body
    const body = await request.json();
    const {
      sessionId,
      devlogId,
      confidence = 1.0,
      reason = 'manual',
      evidence = {},
      confirmed = true,
      createdBy = 'user',
    } = body;

    // Validate required fields
    if (!sessionId || !devlogId) {
      return NextResponse.json({ error: 'sessionId and devlogId are required' }, { status: 400 });
    }

    console.log(`[ChatAPI] Creating chat-devlog link: ${sessionId} -> ${devlogId}`);

    // Get storage provider for this workspace
    const storageProvider = await manager.getWorkspaceStorageProvider(workspaceId);

    // Verify session exists
    const session = await storageProvider.getChatSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: `Chat session '${sessionId}' not found` }, { status: 404 });
    }

    // Verify devlog exists
    const devlog = await storageProvider.get(devlogId);
    if (!devlog) {
      return NextResponse.json({ error: `Devlog entry '${devlogId}' not found` }, { status: 404 });
    }

    // Create the link
    const link = {
      sessionId,
      devlogId,
      confidence,
      reason,
      evidence,
      confirmed,
      createdAt: new Date().toISOString(),
      createdBy,
    };

    await storageProvider.saveChatDevlogLink(link);

    return NextResponse.json({
      success: true,
      link,
      message: `Chat-devlog link created: ${sessionId} -> ${devlogId}`,
    });
  } catch (error) {
    console.error('[ChatAPI] Create link error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create chat-devlog link';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/workspaces/[id]/chat/links
 *
 * Remove a chat-devlog link
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const manager = await getSharedWorkspaceManager();
    const workspaceId = params.id;

    const { searchParams } = new URL(request.url);

    // Parse required parameters
    const sessionId = searchParams.get('sessionId');
    const devlogId = searchParams.get('devlogId');

    if (!sessionId || !devlogId) {
      return NextResponse.json(
        { error: 'sessionId and devlogId query parameters are required' },
        { status: 400 },
      );
    }

    console.log(`[ChatAPI] Removing chat-devlog link: ${sessionId} -> ${devlogId}`);

    // Get storage provider for this workspace
    const storageProvider = await manager.getWorkspaceStorageProvider(workspaceId);

    // Remove the link
    await storageProvider.removeChatDevlogLink(sessionId, parseInt(devlogId, 10));

    return NextResponse.json({
      success: true,
      message: `Chat-devlog link removed: ${sessionId} -> ${devlogId}`,
    });
  } catch (error) {
    console.error('[ChatAPI] Remove link error:', error);
    const message = error instanceof Error ? error.message : 'Failed to remove chat-devlog link';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
