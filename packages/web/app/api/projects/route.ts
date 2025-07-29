import { NextRequest, NextResponse } from 'next/server';
import { ProjectService } from '@codervisor/devlog-core';
import { ApiValidator, CreateProjectBodySchema, WebToServiceProjectCreateSchema } from '@/schemas';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects - List all projects
export async function GET(request: NextRequest) {
  try {
    const projectService = ProjectService.getInstance();
    await projectService.initialize();

    const coreProjects = await projectService.list();
    
    // Transform core project data to web interface format
    const projects = coreProjects.map(project => ({
      id: project.id.toString(), // Convert number to string
      name: project.name,
      description: project.description,
      tags: [], // Add empty tags array for compatibility
      createdAt: project.createdAt.toISOString(), // Convert Date to string
      updatedAt: project.lastAccessedAt.toISOString(), // Map lastAccessedAt to updatedAt
    }));

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return ApiValidator.handleServiceError(error);
  }
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
  try {
    // Validate request body (HTTP layer validation)
    const bodyValidation = await ApiValidator.validateJsonBody(request, CreateProjectBodySchema);
    if (!bodyValidation.success) {
      return bodyValidation.response;
    }

    // Transform to service layer type (with additional validation)
    const serviceData = ApiValidator.transformForService(
      bodyValidation.data, 
      WebToServiceProjectCreateSchema
    );

    const projectService = ProjectService.getInstance();
    await projectService.initialize();

    // Create project (service layer will perform business logic validation)
    const coreProject = await projectService.create(serviceData);

    // Transform core project data to web interface format
    const createdProject = {
      id: coreProject.id.toString(), // Convert number to string
      name: coreProject.name,
      description: coreProject.description,
      tags: [], // Add empty tags array for compatibility
      createdAt: coreProject.createdAt.toISOString(), // Convert Date to string
      updatedAt: coreProject.lastAccessedAt.toISOString(), // Map lastAccessedAt to updatedAt
    };

    return NextResponse.json(createdProject, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return ApiValidator.handleServiceError(error);
  }
}
