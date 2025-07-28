import { NextRequest, NextResponse } from 'next/server';
import { getProjectManager, getAppStorageConfig } from '../../../../../lib/project-manager';
import { ProjectDevlogManager } from '@codervisor/devlog-core';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects/[id]/devlogs/[devlogId] - Get specific devlog entry
export async function GET(
  request: NextRequest,
  { params }: { params: { id: number; devlogId: number } },
) {
  try {
    const projectManager = await getProjectManager();
    const project = await projectManager.getProject(params.id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get centralized storage config
    const storageConfig = await getAppStorageConfig();

    // Check if we got an error response
    if ('status' in storageConfig && storageConfig.status === 'error') {
      return NextResponse.json({ error: 'Storage configuration error' }, { status: 500 });
    }

    // Create project-aware devlog manager
    const devlogManager = new ProjectDevlogManager({
      storageConfig: storageConfig as any, // Type assertion after error check
      projectContext: {
        projectId: params.id,
        project,
      },
    });

    await devlogManager.initialize();

    const entry = await devlogManager.get(params.devlogId);

    await devlogManager.dispose();

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
    const project = await projectManager.getProject(params.id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const data = await request.json();

    // Get centralized storage config
    const storageConfig = await getAppStorageConfig();

    // Check if we got an error response
    if ('status' in storageConfig && storageConfig.status === 'error') {
      return NextResponse.json({ error: 'Storage configuration error' }, { status: 500 });
    }

    // Create project-aware devlog manager
    const devlogManager = new ProjectDevlogManager({
      storageConfig: storageConfig as any, // Type assertion after error check
      projectContext: {
        projectId: params.id,
        project,
      },
    });

    await devlogManager.initialize();

    // Verify entry exists and belongs to project
    const existingEntry = await devlogManager.get(params.devlogId);
    if (!existingEntry) {
      await devlogManager.dispose();
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

    await devlogManager.save(updatedEntry);

    await devlogManager.dispose();

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
    const project = await projectManager.getProject(params.id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get centralized storage config
    const storageConfig = await getAppStorageConfig();

    // Check if we got an error response
    if ('status' in storageConfig && storageConfig.status === 'error') {
      return NextResponse.json({ error: 'Storage configuration error' }, { status: 500 });
    }

    // Create project-aware devlog manager
    const devlogManager = new ProjectDevlogManager({
      storageConfig: storageConfig as any, // Type assertion after error check
      projectContext: {
        projectId: params.id,
        project,
      },
    });

    await devlogManager.initialize();

    // Verify entry exists and belongs to project
    const existingEntry = await devlogManager.get(params.devlogId);
    if (!existingEntry) {
      await devlogManager.dispose();
      return NextResponse.json({ error: 'Devlog entry not found' }, { status: 404 });
    }

    await devlogManager.delete(params.devlogId);

    await devlogManager.dispose();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting devlog:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete devlog';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
