import { NextRequest, NextResponse } from 'next/server';
import {
  getProjectManager,
  getAppStorageConfig,
  getProjectStorageInfo,
} from '../../lib/project-manager';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects - List all projects
export async function GET(request: NextRequest) {
  try {
    const manager = await getProjectManager();
    const projects = await manager.listProjects();
    const currentProject = await manager.getCurrentProject();
    const appStorageConfig = await getAppStorageConfig();
    const projectStorageInfo = await getProjectStorageInfo();

    return NextResponse.json({
      projects,
      currentProject,
      appStorageConfig, // Centralized storage configuration
      projectStorageInfo, // Project metadata storage info
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
  try {
    const manager = await getProjectManager();
    const projectData = await request.json();

    if (!projectData.id || !projectData.name) {
      return NextResponse.json({ error: 'Project id and name are required' }, { status: 400 });
    }

    const createdProject = await manager.createProject(projectData);

    return NextResponse.json(createdProject, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    const message = error instanceof Error ? error.message : 'Failed to create project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
