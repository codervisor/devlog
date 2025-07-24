import { NextRequest, NextResponse } from 'next/server';
import { getSharedWorkspaceManager } from '@/lib/shared-workspace-manager';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

/**
 * GET /api/workspaces/[id]/chat/sessions/[sessionId]
 *
 * Get a specific chat session with messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; sessionId: string } },
) {
  try {
    const manager = await getSharedWorkspaceManager();
    const workspaceId = params.id;
    const sessionId = params.sessionId;

    const { searchParams } = new URL(request.url);

    // Parse message pagination
    const messageOffset = searchParams.get('messageOffset');
    const messageLimit = searchParams.get('messageLimit');
    const includeMessages = searchParams.get('includeMessages') !== 'false';

    console.log(`[ChatAPI] Getting session ${sessionId} for workspace ${workspaceId}`);

    // Get storage provider for this workspace
    const storageProvider = await manager.getWorkspaceStorageProvider(workspaceId);

    // Get chat session
    const session = await storageProvider.getChatSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: `Chat session '${sessionId}' not found` }, { status: 404 });
    }

    // Get messages if requested
    let messages = undefined;
    if (includeMessages) {
      const offset = messageOffset ? parseInt(messageOffset, 10) : undefined;
      const limit = messageLimit ? parseInt(messageLimit, 10) : undefined;

      messages = await storageProvider.getChatMessages(sessionId, offset, limit);
    }

    // Get devlog links for this session
    const links = await storageProvider.getChatDevlogLinks(sessionId);

    return NextResponse.json({
      success: true,
      session: {
        ...session,
        linkedDevlogs: links.map((link) => link.devlogId),
      },
      messages,
      links,
      messageCount: session.messageCount,
    });
  } catch (error) {
    console.error('[ChatAPI] Get session error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get chat session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
