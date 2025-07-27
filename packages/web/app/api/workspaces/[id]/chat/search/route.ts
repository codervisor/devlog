import { NextRequest, NextResponse } from 'next/server';
import { getSharedWorkspaceManager } from '@/lib/shared-workspace-manager';
import type { ChatFilter } from '@codervisor/devlog-core';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

/**
 * GET /api/workspaces/[id]/chat/search
 *
 * Search chat content using full-text search
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const manager = await getSharedWorkspaceManager();
    const workspaceId = params.id;

    const { searchParams } = new URL(request.url);

    // Get search query
    const query = searchParams.get('q');
    if (!query || query.trim() === '') {
      return NextResponse.json(
        { error: 'Search query parameter "q" is required' },
        { status: 400 },
      );
    }

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

    // Parse result limit
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    console.log(
      `[ChatAPI] Searching chat content for workspace ${workspaceId} with query: "${query}"`,
    );

    // Get storage provider for this workspace
    const storageProvider = await manager.getWorkspaceStorageProvider(workspaceId);

    // Search chat content
    const results = await storageProvider.searchChatContent(query, filter, limit);

    return NextResponse.json({
      success: true,
      query,
      results,
      resultCount: results.length,
      filter,
    });
  } catch (error) {
    console.error('[ChatAPI] Search error:', error);
    const message = error instanceof Error ? error.message : 'Failed to search chat content';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
