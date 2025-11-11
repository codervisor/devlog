/**
 * Workspace Detail API Endpoint
 *
 * GET /api/workspaces/[workspaceId] - Get workspace by VS Code ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { HierarchyService } from '@codervisor/devlog-core/server';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * GET /api/workspaces/:workspaceId - Get workspace by VS Code ID
 *
 * Returns workspace details with resolved context (project, machine)
 * and recent chat sessions.
 */
export async function GET(request: NextRequest, { params }: { params: { workspaceId: string } }) {
  try {
    const { workspaceId } = params;

    // Get hierarchy service
    const hierarchyService = HierarchyService.getInstance();
    await hierarchyService.ensureInitialized();

    // Resolve workspace context
    const context = await hierarchyService.resolveWorkspace(workspaceId);

    // Get Prisma client to fetch workspace with details
    const { getPrismaClient } = await import('@codervisor/devlog-core/server');
    const prisma = getPrismaClient();

    const workspace = await prisma.workspace.findUnique({
      where: { workspaceId },
      include: {
        project: true,
        machine: true,
        chatSessions: {
          orderBy: { startedAt: 'desc' },
          take: 10,
          include: {
            _count: {
              select: { chatMessages: true },
            },
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    return NextResponse.json({
      workspace,
      context,
    });
  } catch (error) {
    console.error('[GET /api/workspaces/:workspaceId] Error:', error);

    // Handle specific error for workspace not found
    if (error instanceof Error && error.message.includes('Workspace not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get workspace',
      },
      { status: 500 },
    );
  }
}
