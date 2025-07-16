import { NextRequest, NextResponse } from 'next/server';
import { getDevlogManager } from '@/lib/devlog-manager';
import { filterTypeToStatusFilter, type FilterType } from '@devlog/core';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/devlogs - List all devlogs with optional pagination
export async function GET(request: NextRequest) {
  try {
    const devlogManager = await getDevlogManager();

    const { searchParams } = new URL(request.url);
    const filter: any = {};
    const searchQuery = searchParams.get('q') || searchParams.get('search');

    // Parse query parameters - handle filterType and status (both can be used together)
    const filterTypeParam = searchParams.get('filterType');
    const statusParam = searchParams.get('status');
    
    if (filterTypeParam && statusParam) {
      // Both filterType and status provided - intersect them
      const filterTypeStatuses = filterTypeToStatusFilter(filterTypeParam as FilterType);
      const requestedStatuses = statusParam.split(',').map((s) => s.trim());
      
      if (filterTypeStatuses) {
        // Find intersection of filterType statuses and requested statuses
        filter.status = requestedStatuses.filter(status => filterTypeStatuses.includes(status as any));
      } else {
        // filterType is 'total', so use requested statuses as-is
        filter.status = requestedStatuses;
      }
    } else if (filterTypeParam) {
      // Only filterType provided
      const statusArray = filterTypeToStatusFilter(filterTypeParam as FilterType);
      if (statusArray) {
        filter.status = statusArray;
      }
      // If filterType is 'total', statusArray will be undefined, which means no status filtering
    } else if (statusParam) {
      // Only status provided - backward compatibility
      filter.status = statusParam.split(',').map((s) => s.trim());
    }

    if (searchParams.get('type')) filter.type = searchParams.get('type') as any;
    if (searchParams.get('priority')) filter.priority = searchParams.get('priority') as any;

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

    // Use search or list based on whether search query is provided
    const devlogs = searchQuery
      ? await devlogManager.searchDevlogs(searchQuery, filter)
      : await devlogManager.listDevlogs(filter);

    return NextResponse.json(devlogs);
  } catch (error) {
    console.error('Error fetching devlogs:', error);
    return NextResponse.json({ error: 'Failed to fetch devlogs' }, { status: 500 });
  }
}

// POST /api/devlogs - Create new devlog
export async function POST(request: NextRequest) {
  try {
    const devlogManager = await getDevlogManager();

    const data = await request.json();
    const devlog = await devlogManager.createDevlog(data);

    // Note: SSE broadcast happens automatically via DevlogManager event emission

    return NextResponse.json(devlog, { status: 201 });
  } catch (error) {
    console.error('Error creating devlog:', error);
    return NextResponse.json({ error: 'Failed to create devlog' }, { status: 500 });
  }
}
