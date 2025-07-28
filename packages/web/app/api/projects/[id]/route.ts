import { NextRequest, NextResponse } from 'next/server';
import { ProjectService } from '@codervisor/devlog-core';
import { ApiValidator, ProjectIdParamSchema, UpdateProjectBodySchema } from '@/schemas';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects/[id] - Get specific project
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Validate project ID parameter
    const paramValidation = ApiValidator.validateParams(params, ProjectIdParamSchema);
    if (!paramValidation.success) {
      return paramValidation.response;
    }

    const projectService = ProjectService.getInstance();
    await projectService.initialize();

    const project = await projectService.get(paramValidation.data.id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return ApiValidator.handleServiceError(error);
  }
}

// PUT /api/projects/[id] - Update project
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Validate project ID parameter
    const paramValidation = ApiValidator.validateParams(params, ProjectIdParamSchema);
    if (!paramValidation.success) {
      return paramValidation.response;
    }

    // Validate request body
    const bodyValidation = await ApiValidator.validateJsonBody(request, UpdateProjectBodySchema);
    if (!bodyValidation.success) {
      return bodyValidation.response;
    }

    const projectService = ProjectService.getInstance();
    await projectService.initialize();

    const updatedProject = await projectService.update(paramValidation.data.id, bodyValidation.data);

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    return ApiValidator.handleServiceError(error);
  }
}

// DELETE /api/projects/[id] - Delete project
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Validate project ID parameter
    const paramValidation = ApiValidator.validateParams(params, ProjectIdParamSchema);
    if (!paramValidation.success) {
      return paramValidation.response;
    }

    const projectService = ProjectService.getInstance();
    await projectService.initialize();

    await projectService.delete(paramValidation.data.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return ApiValidator.handleServiceError(error);
  }
}
