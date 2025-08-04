import { NextRequest, NextResponse } from 'next/server';
import { ProjectService } from '@codervisor/devlog-core';
import { ApiValidator, CreateProjectBodySchema, WebToServiceProjectCreateSchema } from '@/schemas';
import { createSimpleCollectionResponse, createSuccessResponse, ApiErrors } from '@/lib';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects - List all projects
export async function GET(request: NextRequest) {
  try {
    const projectService = ProjectService.getInstance();

    const projects = await projectService.list();

    // Return new standardized format
    return createSimpleCollectionResponse(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return ApiErrors.internalError('Failed to fetch projects');
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
      WebToServiceProjectCreateSchema,
    );

    const projectService = ProjectService.getInstance();

    // Create project (service layer will perform business logic validation)
    const createdProject = await projectService.create(serviceData);

    return createSuccessResponse(createdProject, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return ApiErrors.internalError('Failed to create project');
  }
}
