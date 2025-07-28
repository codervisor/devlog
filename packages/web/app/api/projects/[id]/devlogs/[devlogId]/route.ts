import { NextRequest, NextResponse } from 'next/server';
import { getProjectManager } from '../../../../../lib/project-manager';
import { createDevlogService } from '../../../../../lib/devlog-service';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects/[id]/devlogs/[devlogId] - Get specific devlog entry
export async function GET(
  request: NextRequest,
  { params }: { params: { id: number; devlogId: number } },
) {
  try {
    const projectManager = await getProjectManager();
    const project = await projectManager.get(params.id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const entry = await devlogService.get(params.devlogId);

    if (!entry) {
      return NextResponse.json({ error: 'Devlog entry not found' }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error fetching devlog:', error);
    return NextResponse.json({ error: 'Failed to fetch devlog' }, { status: 500 });
  }
}

// PUT /api/projects/[id]/devlogs/[devlogId] - Update devlog entry
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: number; devlogId: number } },
) {
  try {
    const projectManager = await getProjectManager();
    const project = await projectManager.get(params.id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const data = await request.json();

    // Create project-aware devlog service
    const devlogService = await createDevlogService({
      projectId: params.id,
      project,
    });

    // Verify entry exists and belongs to project
    const existingEntry = await devlogService.get(params.devlogId);
    if (!existingEntry) {
      await devlogService.dispose();
      return NextResponse.json({ error: 'Devlog entry not found' }, { status: 404 });
    }

    // Update entry
    const updatedEntry = {
      ...existingEntry,
      ...data,
      id: params.devlogId,
      projectId: params.id, // Ensure project context is maintained
      updatedAt: new Date().toISOString(),
    };

    await devlogService.save(updatedEntry);

    await devlogService.dispose();

    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error('Error updating devlog:', error);
    const message = error instanceof Error ? error.message : 'Failed to update devlog';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/devlogs/[devlogId] - Delete devlog entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: number; devlogId: number } },
) {
  try {
    const projectManager = await getProjectManager();
    const project = await projectManager.get(params.id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Create project-aware devlog service
    const devlogService = await createDevlogService({
      projectId: params.id,
      project,
    });

    // Verify entry exists and belongs to project
    const existingEntry = await devlogService.get(params.devlogId);
    if (!existingEntry) {
      await devlogService.dispose();
      return NextResponse.json({ error: 'Devlog entry not found' }, { status: 404 });
    }

    await devlogService.delete(params.devlogId);

    await devlogService.dispose();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting devlog:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete devlog';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
