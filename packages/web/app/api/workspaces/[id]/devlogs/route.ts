import { NextRequest, NextResponse } from 'next/server';
import { getSharedWorkspaceManager } from '@/lib/shared-workspace-manager';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const manager = await getSharedWorkspaceManager();
    const workspaceId = params.id;

    const { searchParams } = new URL(request.url);
    const filter: any = {};

    // Get search query parameter
    const searchQuery = searchParams.get('search');

    // Parse query parameters (same as main devlogs API)
    if (searchParams.get('status')) filter.status = searchParams.get('status')?.split(',');
    if (searchParams.get('type')) filter.type = searchParams.get('type');
    if (searchParams.get('priority')) filter.priority = searchParams.get('priority');

    // Handle archived parameter - if not specified, exclude archived entries by default
    const archivedParam = searchParams.get('archived');
    if (archivedParam !== null) {
      filter.archived = archivedParam === 'true';
    }
    // Note: if archived is not specified, storage providers will exclude archived entries by default

    // Parse pagination parameters
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder');

    if (page || limit || sortBy) {
      filter.pagination = {
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        sortBy: sortBy as any,
        sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
      };
    }

    // Use search method if search query is provided, otherwise use list method
    let devlogs;
    if (searchQuery && searchQuery.trim()) {
      devlogs = await manager.searchDevlogsFromWorkspace(workspaceId, searchQuery.trim(), filter);
    } else {
      devlogs = await manager.listDevlogsFromWorkspace(workspaceId, filter);
    }

    return NextResponse.json(devlogs);
  } catch (error) {
    console.error('Error fetching workspace devlogs:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch workspace devlogs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const manager = await getSharedWorkspaceManager();
    const workspaceId = params.id;

    // Switch to the target workspace first
    await manager.switchToWorkspace(workspaceId);

    const body = await request.json();
    const devlog = await manager.createDevlog(body);

    return NextResponse.json(devlog);
  } catch (error) {
    console.error('Error creating workspace devlog:', error);
    const message = error instanceof Error ? error.message : 'Failed to create devlog';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
