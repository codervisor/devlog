import { NextRequest, NextResponse } from 'next/server';
import { DevlogService, ProjectService } from '@codervisor/devlog-core';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects/[id]/devlogs - List devlogs for a project
export async function GET(request: NextRequest, { params }: { params: { id: number } }) {
  try {
    const projectService = ProjectService.getInstance();
    await projectService.initialize();
    const project = await projectService.get(params.id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Create project-aware devlog service
    const devlogService = DevlogService.getInstance(params.id);

    // Parse query parameters for filtering
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const filter: any = {};

    // Status filter
    const status = searchParams.get('status');
    if (status) {
      filter.status = status.split(',');
    }

    // Type filter
    const type = searchParams.get('type');
    if (type) {
      filter.type = type.split(',');
    }

    // Priority filter
    const priority = searchParams.get('priority');
    if (priority) {
      filter.priority = priority.split(',');
    }

    // Search query
    const search = searchParams.get('search');

    // Archived filter
    const archived = searchParams.get('archived');
    if (archived !== null) {
      filter.archived = archived === 'true';
    }

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    filter.pagination = { page, limit };

    let result;
    if (search) {
      result = await devlogService.search(search, filter);
    } else {
      result = await devlogService.list(filter);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching devlogs:', error);
    return NextResponse.json({ error: 'Failed to fetch devlogs' }, { status: 500 });
  }
}

// POST /api/projects/[id]/devlogs - Create new devlog entry
export async function POST(request: NextRequest, { params }: { params: { id: number } }) {
  try {
    const projectService = ProjectService.getInstance();
    const project = await projectService.get(params.id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const data = await request.json();

    // Create project-aware devlog service
    const devlogService = DevlogService.getInstance(params.id);

    // Add required fields if missing
    const now = new Date().toISOString();
    const devlogEntry = {
      ...data,
      createdAt: now,
      updatedAt: now,
      projectId: params.id, // Ensure project context
    };

    // Get next ID if not provided
    if (!devlogEntry.id) {
      devlogEntry.id = await devlogService.getNextId();
    }

    await devlogService.save(devlogEntry);

    return NextResponse.json(devlogEntry, { status: 201 });
  } catch (error) {
    console.error('Error creating devlog:', error);
    const message = error instanceof Error ? error.message : 'Failed to create devlog';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
