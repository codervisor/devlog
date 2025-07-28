import { NextRequest, NextResponse } from 'next/server';
import { ProjectService } from '@codervisor/devlog-core';
import { ApiValidator, CreateProjectBodySchema } from '@/schemas';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects - List all projects
export async function GET(request: NextRequest) {
  try {
    const projectService = ProjectService.getInstance();
    await projectService.initialize();

    const result = await projectService.list();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return ApiValidator.handleServiceError(error);
  }
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const bodyValidation = await ApiValidator.validateJsonBody(request, CreateProjectBodySchema);
    if (!bodyValidation.success) {
      return bodyValidation.response;
    }

    const projectService = ProjectService.getInstance();
    await projectService.initialize();

    // Create project (service layer will perform business logic validation)
    const createdProject = await projectService.create(bodyValidation.data);

    return NextResponse.json(createdProject, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return ApiValidator.handleServiceError(error);
  }
}
