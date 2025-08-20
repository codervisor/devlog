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

// GET /api/projects/[name] - Get specific project
export const GET = withErrorHandling(
  async (req: NextRequest, { params }: { params: { name: string } }) => {
    const paramResult = RouteParams.parseProjectName(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectName } = paramResult.data;
    const projectResult = await ServiceHelper.getProjectByNameOrFail(projectName);
    if (!projectResult.success) {
      return projectResult.response;
    }

    return createSuccessResponse(projectResult.data.project);
  },
);

// PUT /api/projects/[name] - Update project
export const PUT = withErrorHandling(
  async (request: NextRequest, { params }: { params: { name: string } }) => {
    // Parse and validate parameters
    const paramResult = RouteParams.parseProjectName(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectName } = paramResult.data;

    // Validate request body (HTTP layer validation)
    const bodyValidation = await ApiValidator.validateJsonBody(request, UpdateProjectBodySchema);
    if (!bodyValidation.success) {
      return bodyValidation.response;
    }

    // Get project and service
    const projectResult = await ServiceHelper.getProjectByNameOrFail(projectName);
    if (!projectResult.success) {
      return projectResult.response;
    }

    // Update project using the resolved project ID
    const updatedProject = await projectResult.data.projectService.update(
      projectResult.data.project.id,
      bodyValidation.data,
    );

    return createSuccessResponse(updatedProject, {
      sseEventType: RealtimeEventType.PROJECT_UPDATED,
    });
  },
);

// DELETE /api/projects/[name] - Delete project
export const DELETE = withErrorHandling(
  async (request: NextRequest, { params }: { params: { name: string } }) => {
    // Parse and validate parameters
    const paramResult = RouteParams.parseProjectName(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectName } = paramResult.data;

    // Get project service
    const projectResult = await ServiceHelper.getProjectByNameOrFail(projectName);
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
