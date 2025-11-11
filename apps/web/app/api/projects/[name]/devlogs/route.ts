import { NextRequest } from 'next/server';
import { PaginationMeta, SortOptions } from '@codervisor/devlog-core';
import { PrismaProjectService, PrismaDevlogService } from '@codervisor/devlog-core/server';
import {
  ApiValidator,
  CreateDevlogBodySchema,
  DevlogListQuerySchema,
  BatchDeleteDevlogsBodySchema,
} from '@/schemas';
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

// GET /api/projects/[name]/devlog - List devlog for a project
export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    // Parse and validate project identifier
    const paramResult = RouteParams.parseProjectName(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectName } = paramResult.data;

    // Validate query parameters
    const url = new URL(request.url);
    const queryValidation = ApiValidator.validateQuery(url.searchParams, DevlogListQuerySchema);
    if (!queryValidation.success) {
      return queryValidation.response;
    }

    // Get project using helper
    const projectResult = await ServiceHelper.getProjectByNameOrFail(projectName);
    if (!projectResult.success) {
      return projectResult.response;
    }

    const project = projectResult.data.project;

    // Create project-aware devlog service using Prisma
    const devlogService = PrismaDevlogService.getInstance(project.id);
    await devlogService.ensureInitialized();

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
      result = await devlogService.search(queryData.search, filter, pagination, sortOptions);
    } else {
      result = await devlogService.list(filter, pagination, sortOptions);
    }

    // Check if result has pagination metadata
    if (result.pagination) {
      return createCollectionResponse(result.items, result.pagination);
    } else {
      // Transform devlog and return as simple collection
      return createSimpleCollectionResponse(result.items);
    }
  } catch (error) {
    console.error('Error fetching devlog:', error);
    return ApiErrors.internalError('Failed to fetch devlog');
  }
}

// POST /api/projects/[name]/devlog - Create new devlog entry
export async function POST(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    // Parse and validate project identifier
    const paramResult = RouteParams.parseProjectName(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectName } = paramResult.data;

    // Validate request body
    const bodyValidation = await ApiValidator.validateJsonBody(request, CreateDevlogBodySchema);
    if (!bodyValidation.success) {
      return bodyValidation.response;
    }

    // Get project using helper
    const projectResult = await ServiceHelper.getProjectByNameOrFail(projectName);
    if (!projectResult.success) {
      return projectResult.response;
    }

    const project = projectResult.data.project;

    // Create project-aware devlog service using Prisma
    const devlogService = PrismaDevlogService.getInstance(project.id);
    await devlogService.ensureInitialized();

    // Prepare entry for creation
    const entry = {
      ...bodyValidation.data,
      projectId: project.id, // Ensure project context
    };

    // Create the entry
    const result = await devlogService.create(entry);

    // Transform and return the created devlog
    return createSuccessResponse(result, {
      status: 201,
      sseEventType: RealtimeEventType.DEVLOG_CREATED,
    });
  } catch (error) {
    console.error('Error creating devlog:', error);
    return ApiErrors.internalError('Failed to create devlog');
  }
}

// DELETE /api/projects/[name]/devlogs - Batch delete devlog entries
export async function DELETE(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    // Parse and validate project identifier
    const paramResult = RouteParams.parseProjectName(params);
    if (!paramResult.success) {
      return paramResult.response;
    }

    const { projectName } = paramResult.data;

    // Validate request body
    const bodyValidation = await ApiValidator.validateJsonBody(
      request,
      BatchDeleteDevlogsBodySchema,
    );
    if (!bodyValidation.success) {
      return bodyValidation.response;
    }

    const { ids } = bodyValidation.data;

    // Get project using helper
    const projectResult = await ServiceHelper.getProjectByNameOrFail(projectName);
    if (!projectResult.success) {
      return projectResult.response;
    }

    const project = projectResult.data.project;

    // Create project-aware devlog service using Prisma
    const devlogService = PrismaDevlogService.getInstance(project.id);
    await devlogService.ensureInitialized();

    // Track successful and failed deletions
    const results = {
      deleted: [] as number[],
      failed: [] as { id: number; error: string }[],
    };

    // Delete devlogs one by one and collect results
    for (const id of ids) {
      try {
        await devlogService.delete(id);
        results.deleted.push(id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({ id, error: errorMessage });
      }
    }

    // Return results with appropriate status
    if (results.failed.length === 0) {
      // All deletions successful
      return createSuccessResponse(
        {
          deleted: results.deleted,
          deletedCount: results.deleted.length,
        },
        {
          status: 200,
          sseEventType: RealtimeEventType.DEVLOG_DELETED,
        },
      );
    } else if (results.deleted.length === 0) {
      // All deletions failed
      return ApiErrors.badRequest('Failed to delete any devlogs', {
        failures: results.failed,
      });
    } else {
      // Partial success
      return createSuccessResponse(
        {
          deleted: results.deleted,
          failed: results.failed,
          deletedCount: results.deleted.length,
          failedCount: results.failed.length,
        },
        {
          status: 207, // Multi-status for partial success
          sseEventType: RealtimeEventType.DEVLOG_DELETED,
        },
      );
    }
  } catch (error) {
    console.error('Error batch deleting devlogs:', error);
    return ApiErrors.internalError('Failed to delete devlogs');
  }
}
