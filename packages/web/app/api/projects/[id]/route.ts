import { NextRequest } from 'next/server';
import {
  createSuccessResponse,
  RouteParams,
  ServiceHelper,
  withErrorHandling,
} from '@/lib/api/api-utils';
import { RealtimeEventType } from '@/lib/realtime';
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

    const { identifier, identifierType } = paramResult.data;

    // Get project using helper
    const projectResult = await ServiceHelper.getProjectByIdentifierOrFail(identifier, identifierType);
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

    const { identifier, identifierType } = paramResult.data;

    // Validate request body (HTTP layer validation)
    const bodyValidation = await ApiValidator.validateJsonBody(request, UpdateProjectBodySchema);
    if (!bodyValidation.success) {
      return bodyValidation.response;
    }

    // Get project and service
    const projectResult = await ServiceHelper.getProjectByIdentifierOrFail(identifier, identifierType);
    if (!projectResult.success) {
      return projectResult.response;
    }

    // Update project using the resolved project ID
    const updatedProject = await projectResult.data.projectService.update(projectResult.data.project.id, bodyValidation.data);

    return createSuccessResponse(updatedProject, { sseEventType: RealtimeEventType.PROJECT_UPDATED });
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

    const { identifier, identifierType } = paramResult.data;

    // Get project service
    const projectResult = await ServiceHelper.getProjectByIdentifierOrFail(identifier, identifierType);
    if (!projectResult.success) {
      return projectResult.response;
    }

    const projectId = projectResult.data.project.id;

    // Delete project
    await projectResult.data.projectService.delete(projectId);

    return createSuccessResponse(
      { deleted: true, projectId },
      { sseEventType: RealtimeEventType.PROJECT_DELETED },
    );
  },
);
