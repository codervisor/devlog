import { NextRequest } from 'next/server';
import { PaginationMeta, SortOptions } from '@codervisor/devlog-core';
import { DevlogService, ProjectService } from '@codervisor/devlog-core/server';
import { ApiValidator, CreateDevlogBodySchema, DevlogListQuerySchema } from '@/schemas';
import {
  ApiErrors,
  createCollectionResponse,
  createSimpleCollectionResponse,
  createSuccessResponse,
  RouteParams,
  ServiceHelper,
} from '@/lib/api/api-utils';
import { RealtimeEventType } from '@/lib/realtime';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/projects/[name]/devlogs - List devlogs for a project
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Parse and validate project identifier
    const paramResult = RouteParams.parseProjectId(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { identifier, identifierType } = paramResult.data;

    // Validate query parameters
    const url = new URL(request.url);
    const queryValidation = ApiValidator.validateQuery(url.searchParams, DevlogListQuerySchema);
    if (!queryValidation.success) {
      return queryValidation.response;
    }

    // Get project using helper
    const projectResult = await ServiceHelper.getProjectByIdentifierOrFail(
      identifier,
      identifierType,
    );
    if (!projectResult.success) {
      return projectResult.response;
    }

    const project = projectResult.data.project;

    // Create project-aware devlog service
    const devlogService = DevlogService.getInstance(project.id);

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

// POST /api/projects/[name]/devlogs - Create new devlog entry
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Parse and validate project identifier
    const paramResult = RouteParams.parseProjectId(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { identifier, identifierType } = paramResult.data;

    // Validate request body
    const bodyValidation = await ApiValidator.validateJsonBody(request, CreateDevlogBodySchema);
    if (!bodyValidation.success) {
      return bodyValidation.response;
    }

    // Get project using helper
    const projectResult = await ServiceHelper.getProjectByIdentifierOrFail(
      identifier,
      identifierType,
    );
    if (!projectResult.success) {
      return projectResult.response;
    }

    const project = projectResult.data.project;

    // Create project-aware devlog service
    const devlogService = DevlogService.getInstance(project.id);

    // Add required fields and get next ID
    const now = new Date().toISOString();
    const nextId = await devlogService.getNextId();

    const entry = {
      ...bodyValidation.data,
      id: nextId,
      createdAt: now,
      updatedAt: now,
      projectId: project.id, // Ensure project context
    };

    // Save the entry
    await devlogService.save(entry);

    // Retrieve the actual saved entry to ensure we have the correct ID
    const savedEntry = await devlogService.get(nextId, false); // Don't include notes for performance

    if (!savedEntry) {
      throw new Error('Failed to retrieve saved devlog entry');
    }

    // Transform and return the actual saved devlog
    return createSuccessResponse(savedEntry, {
      status: 201,
      sseEventType: RealtimeEventType.DEVLOG_CREATED,
    });
  } catch (error) {
    console.error('Error creating devlog:', error);
    return ApiErrors.internalError('Failed to create devlog');
  }
}
