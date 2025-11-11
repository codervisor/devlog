/**
 * Project Hierarchy API Endpoint
 *
 * GET /api/projects/[id]/hierarchy - Get full project hierarchy tree
 */

import { NextRequest, NextResponse } from 'next/server';
import { HierarchyService } from '@codervisor/devlog-core/server';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * GET /api/projects/:id/hierarchy - Get full hierarchy tree
 *
 * Returns the complete project hierarchy including all machines,
 * workspaces, and session information organized in a tree structure.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const projectId = parseInt(params.id, 10);

    if (isNaN(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Get hierarchy service
    const hierarchyService = HierarchyService.getInstance();
    await hierarchyService.ensureInitialized();

    // Get project hierarchy
    const hierarchy = await hierarchyService.getProjectHierarchy(projectId);

    return NextResponse.json(hierarchy);
  } catch (error) {
    console.error('[GET /api/projects/:id/hierarchy] Error:', error);

    // Handle specific error for project not found
    if (error instanceof Error && error.message.includes('Project not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get project hierarchy',
      },
      { status: 500 },
    );
  }
}
