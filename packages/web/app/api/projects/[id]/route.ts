import { NextRequest } from 'next/server';
import { RouteParams, ServiceHelper, withErrorHandling, createSuccessResponse } from '@/lib';
import { ApiValidator, UpdateProjectBodySchema } from '@/schemas';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects/[id] - Get specific project
export const GET = withErrorHandling(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    // Parse and validate parameters
    const paramResult = RouteParams.parseProjectId(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectId } = paramResult.data;

    // Get project using helper
    const projectResult = await ServiceHelper.getProjectOrFail(projectId);
    if (!projectResult.success) {
      return projectResult.response;
    }

    // Transform and return project data
    return createSuccessResponse(projectResult.data!.project);
  },
);

// PUT /api/projects/[id] - Update project
export const PUT = withErrorHandling(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    // Parse and validate parameters
    const paramResult = RouteParams.parseProjectId(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectId } = paramResult.data;

    // Validate request body (HTTP layer validation)
    const bodyValidation = await ApiValidator.validateJsonBody(request, UpdateProjectBodySchema);
    if (!bodyValidation.success) {
      return bodyValidation.response;
    }

    // Get project and service
    const projectResult = await ServiceHelper.getProjectOrFail(projectId);
    if (!projectResult.success) {
      return projectResult.response;
    }

    // Parse request body
    const data = await request.json();

    // Update project
    const updatedProject = await projectResult.data.projectService.update(projectId, data);

    return createSuccessResponse(updatedProject);
  },
);

// DELETE /api/projects/[id] - Delete project
export const DELETE = withErrorHandling(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    // Parse and validate parameters
    const paramResult = RouteParams.parseProjectId(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectId } = paramResult.data;

    // Get project service
    const projectResult = await ServiceHelper.getProjectOrFail(projectId);
    if (!projectResult.success) {
      return projectResult.response;
    }

    // Delete project
    await projectResult.data.projectService.delete(projectId);

    return createSuccessResponse({ deleted: true, projectId });
  },
);
