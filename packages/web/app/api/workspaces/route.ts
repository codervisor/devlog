/**
 * Workspace API Endpoint
 *
 * POST /api/workspaces - Upsert workspace
 */

import { NextRequest, NextResponse } from 'next/server';
import { HierarchyService } from '@codervisor/devlog-core/server';
import { WorkspaceCreateSchema } from '@/schemas/hierarchy';
import { ApiValidator } from '@/schemas/validation';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * POST /api/workspaces - Upsert workspace
 *
 * Creates a new workspace or updates an existing one based on workspaceId.
 * Updates lastSeenAt timestamp on each request.
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await ApiValidator.validateJsonBody(request, WorkspaceCreateSchema);

    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;

    // Get hierarchy service
    const hierarchyService = HierarchyService.getInstance();
    await hierarchyService.ensureInitialized();

    // Upsert workspace
    const workspace = await hierarchyService.upsertWorkspace(data);

    return NextResponse.json(workspace, { status: 200 });
  } catch (error) {
    console.error('[POST /api/workspaces] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to upsert workspace',
      },
      { status: 500 },
    );
  }
}
