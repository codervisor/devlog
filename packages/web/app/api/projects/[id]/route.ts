import { NextRequest, NextResponse } from 'next/server';
import { ProjectService } from '@codervisor/devlog-core';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects/[id] - Get specific project
export async function GET(request: NextRequest, { params }: { params: { id: number } }) {
  try {
    const projectService = ProjectService.getInstance();
    await projectService.initialize();

    const project = await projectService.get(params.id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

// PUT /api/projects/[id] - Update project
export async function PUT(request: NextRequest, { params }: { params: { id: number } }) {
  try {
    const projectService = ProjectService.getInstance();
    await projectService.initialize();

    const updates = await request.json();

    const updatedProject = await projectService.update(params.id, updates);

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    const message = error instanceof Error ? error.message : 'Failed to update project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/projects/[id] - Delete project
export async function DELETE(request: NextRequest, { params }: { params: { id: number } }) {
  try {
    const projectService = ProjectService.getInstance();
    await projectService.initialize();

    await projectService.delete(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
