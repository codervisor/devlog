import { NextRequest } from 'next/server';
import {
  DevlogService,
  PaginationMeta,
  ProjectService,
  SortOptions,
} from '@codervisor/devlog-core';
import {
  ApiValidator,
  CreateDevlogBodySchema,
  DevlogListQuerySchema,
  ProjectIdParamSchema,
} from '@/schemas';
import {
  ApiErrors,
  createCollectionResponse,
  createSimpleCollectionResponse,
  createSuccessResponse,
  SSEEventType,
} from '@/lib';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects/[id]/devlogs - List devlogs for a project
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Validate project ID parameter
    const paramValidation = ApiValidator.validateParams(params, ProjectIdParamSchema);
    if (!paramValidation.success) {
      return paramValidation.response;
    }

    // Validate query parameters
    const url = new URL(request.url);
    const queryValidation = ApiValidator.validateQuery(url.searchParams, DevlogListQuerySchema);
    if (!queryValidation.success) {
      return queryValidation.response;
    }

    const projectService = ProjectService.getInstance();
    const project = await projectService.get(paramValidation.data.id);
    if (!project) {
      return ApiErrors.projectNotFound();
    }

    // Create project-aware devlog service
    const devlogService = DevlogService.getInstance(paramValidation.data.id);

    const queryData = queryValidation.data;
    const filter: any = {};

    // Apply validated filters
    if (queryData.status) filter.status = [queryData.status];
    if (queryData.type) filter.type = [queryData.type];
    if (queryData.priority) filter.priority = [queryData.priority];
    if (queryData.assignee) filter.assignee = queryData.assignee;
    if (queryData.archived !== undefined) filter.archived = queryData.archived;
    if (queryData.fromDate) filter.fromDate = queryData.fromDate;
    if (queryData.toDate) filter.toDate = queryData.toDate;
    if (queryData.search) filter.search = queryData.search;

    // Pagination - support both offset/limit and page-based pagination
    const page =
      queryData.page ||
      (queryData.offset ? Math.floor(queryData.offset / (queryData.limit || 20)) + 1 : 1);
    const limit = queryData.limit || 20;

    const pagination: PaginationMeta = {
      page,
      limit,
    };

    const sortOptions: SortOptions = {
      sortBy: queryData.sortBy || 'updatedAt',
      sortOrder: queryData.sortOrder || 'desc',
    };

    let result;
    if (queryData.search) {
      result = await devlogService.search(queryData.search, filter);
    } else {
      result = await devlogService.list(filter);
    }

    // Check if result has pagination metadata
    if (result.pagination) {
      return createCollectionResponse(result.items, result.pagination);
    } else {
      // Transform devlogs and return as simple collection
      return createSimpleCollectionResponse(result.items);
    }
  } catch (error) {
    console.error('Error fetching devlogs:', error);
    return ApiErrors.internalError('Failed to fetch devlogs');
  }
}

// POST /api/projects/[id]/devlogs - Create new devlog entry
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Validate project ID parameter
    const paramValidation = ApiValidator.validateParams(params, ProjectIdParamSchema);
    if (!paramValidation.success) {
      return paramValidation.response;
    }

    // Validate request body
    const bodyValidation = await ApiValidator.validateJsonBody(request, CreateDevlogBodySchema);
    if (!bodyValidation.success) {
      return bodyValidation.response;
    }

    const projectService = ProjectService.getInstance();
    const project = await projectService.get(paramValidation.data.id);
    if (!project) {
      return ApiErrors.projectNotFound();
    }

    // Create project-aware devlog service
    const devlogService = DevlogService.getInstance(paramValidation.data.id);

    // Add required fields and get next ID
    const now = new Date().toISOString();
    const nextId = await devlogService.getNextId();

    const devlogEntry = {
      id: nextId,
      ...bodyValidation.data,
      createdAt: now,
      updatedAt: now,
      projectId: paramValidation.data.id, // Ensure project context
    };

    await devlogService.save(devlogEntry);

    // Retrieve the actual saved entry to ensure we have the correct ID
    const savedEntry = await devlogService.get(nextId, false); // Don't include notes for performance

    if (!savedEntry) {
      throw new Error('Failed to retrieve saved devlog entry');
    }

    // Transform and return the actual saved devlog
    return createSuccessResponse(savedEntry, {
      status: 201,
      sseEventType: SSEEventType.DEVLOG_CREATED,
    });
  } catch (error) {
    console.error('Error creating devlog:', error);
    return ApiErrors.internalError('Failed to create devlog');
  }
}
