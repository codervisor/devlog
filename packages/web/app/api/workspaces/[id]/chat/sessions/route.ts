import { NextRequest, NextResponse } from 'next/server';
import { getSharedWorkspaceManager } from '@/lib/shared-workspace-manager';
import type { ChatFilter } from '@codervisor/devlog-core';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

/**
 * GET /api/workspaces/[id]/chat/sessions
 *
 * List chat sessions with optional filtering and pagination
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const manager = await getSharedWorkspaceManager();
    const workspaceId = params.id;

    const { searchParams } = new URL(request.url);

    // Build filter object
    const filter: ChatFilter = {};

    // Parse agent filter
    const agentParam = searchParams.get('agent');
    if (agentParam) {
      filter.agent = agentParam.split(',') as any[];
    }

    // Parse status filter
    const statusParam = searchParams.get('status');
    if (statusParam) {
      filter.status = statusParam.split(',') as any[];
    }

    // Parse workspace filter
    const workspaceParam = searchParams.get('workspace');
    if (workspaceParam) {
      filter.workspace = workspaceParam.split(',');
    }

    // Parse archived filter
    const archivedParam = searchParams.get('includeArchived');
    if (archivedParam !== null) {
      filter.includeArchived = archivedParam === 'true';
    }

    // Parse date range filters
    const fromDate = searchParams.get('fromDate');
    if (fromDate) {
      filter.fromDate = fromDate;
    }

    const toDate = searchParams.get('toDate');
    if (toDate) {
      filter.toDate = toDate;
    }

    // Parse message count filters
    const minMessages = searchParams.get('minMessages');
    if (minMessages) {
      filter.minMessages = parseInt(minMessages, 10);
    }

    const maxMessages = searchParams.get('maxMessages');
    if (maxMessages) {
      filter.maxMessages = parseInt(maxMessages, 10);
    }

    // Parse tags filter
    const tagsParam = searchParams.get('tags');
    if (tagsParam) {
      filter.tags = tagsParam.split(',');
    }

    // Parse linked devlog filter
    const linkedDevlog = searchParams.get('linkedDevlog');
    if (linkedDevlog) {
      filter.linkedDevlog = parseInt(linkedDevlog, 10);
    }

    // Parse pagination parameters
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');
    const offset = page && limit ? (parseInt(page, 10) - 1) * parseInt(limit, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;

    console.log(`[ChatAPI] Listing sessions for workspace ${workspaceId} with filter:`, filter);

    // Get storage provider for this workspace
    const storageProvider = await manager.getWorkspaceStorageProvider(workspaceId);

    // Get chat sessions
    const sessions = await storageProvider.listChatSessions(filter, offset, limitNum);

    return NextResponse.json({
      success: true,
      sessions,
      filter,
      pagination: {
        page: page ? parseInt(page, 10) : 1,
        limit: limitNum || sessions.length,
        total: sessions.length, // TODO: Get actual total count
      },
    });
  } catch (error) {
    console.error('[ChatAPI] List sessions error:', error);
    const message = error instanceof Error ? error.message : 'Failed to list chat sessions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
