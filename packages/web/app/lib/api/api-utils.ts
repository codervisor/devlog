/**
 * API utilities for handling common patterns in Next.js API routes
 * Consolidated utilities for parameter parsing, service helpers, and response handling
 */

import { NextResponse } from 'next/server';
import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  CollectionResponse,
  ResponseMeta,
} from '@/schemas/responses';
import { PaginationMeta } from '@codervisor/devlog-core';

/**
 * Type-safe parameter parser for API routes
 */
export const RouteParams = {
  /**
   * Parse project ID parameter
   * Usage: /api/projects/[id]
   */
  parseProjectId(params: { id: string }) {
    try {
      const projectId = parseInt(params.id, 10);
      if (isNaN(projectId) || projectId <= 0) {
        return {
          success: false as const,
          response: NextResponse.json(
            { error: 'Invalid project ID: must be a positive integer' },
            { status: 400 },
          ),
        };
      }

      return {
        success: true as const,
        data: { projectId },
      };
    } catch (error) {
      return {
        success: false as const,
        response: NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 }),
      };
    }
  },

  /**
   * Parse project ID and devlog ID parameters
   * Usage: /api/projects/[id]/devlogs/[devlogId]
   */
  parseProjectAndDevlogId(params: { id: string; devlogId: string }) {
    try {
      const projectId = parseInt(params.id, 10);
      const devlogId = parseInt(params.devlogId, 10);

      if (isNaN(projectId) || projectId <= 0) {
        return {
          success: false as const,
          response: NextResponse.json(
            { error: 'Invalid project ID: must be a positive integer' },
            { status: 400 },
          ),
        };
      }

      if (isNaN(devlogId) || devlogId <= 0) {
        return {
          success: false as const,
          response: NextResponse.json(
            { error: 'Invalid devlog ID: must be a positive integer' },
            { status: 400 },
          ),
        };
      }

      return {
        success: true as const,
        data: { projectId, devlogId },
      };
    } catch (error) {
      return {
        success: false as const,
        response: NextResponse.json({ error: 'Invalid parameter format' }, { status: 400 }),
      };
    }
  },
};

/**
 * Service initialization helper
 * Ensures services are properly initialized before use
 */
export class ServiceHelper {
  /**
   * Get project and ensure it exists
   */
  static async getProjectOrFail(projectId: number) {
    const { ProjectService } = await import('@codervisor/devlog-core');
    const projectService = ProjectService.getInstance();
    const project = await projectService.get(projectId);
    if (!project) {
      return { success: false as const, response: ApiErrors.projectNotFound() };
    }

    return { success: true as const, data: { project, projectService } };
  }

  /**
   * Get devlog service for a project
   */
  static async getDevlogService(projectId: number) {
    const { DevlogService } = await import('@codervisor/devlog-core');
    const devlogService = DevlogService.getInstance(projectId);
    return devlogService;
  }

  /**
   * Get devlog entry and ensure it exists
   */
  static async getDevlogOrFail(projectId: number, devlogId: number) {
    const devlogService = await this.getDevlogService(projectId);

    const entry = await devlogService.get(devlogId);
    if (!entry) {
      return { success: false as const, response: ApiErrors.devlogNotFound() };
    }

    return { success: true as const, data: { entry, devlogService } };
  }
}

/**
 * Common error response patterns - Standardized API Error Responses
 */
export const ApiErrors = {
  // Resource not found errors
  projectNotFound: () =>
    createErrorResponse('PROJECT_NOT_FOUND', 'Project not found', { status: 404 }),
  devlogNotFound: () =>
    createErrorResponse('DEVLOG_NOT_FOUND', 'Devlog entry not found', { status: 404 }),
  noteNotFound: () => createErrorResponse('NOTE_NOT_FOUND', 'Note not found', { status: 404 }),
  notFound: (resource: string = 'Resource') =>
    createErrorResponse('RESOURCE_NOT_FOUND', `${resource} not found`, { status: 404 }),

  // Client errors
  invalidRequest: (message: string, details?: any) =>
    createErrorResponse('BAD_REQUEST', message, { status: 400, details }),
  badRequest: (message: string, details?: any) =>
    createErrorResponse('BAD_REQUEST', message, { status: 400, details }),
  unauthorized: (message: string = 'Unauthorized') =>
    createErrorResponse('UNAUTHORIZED', message, { status: 401 }),
  forbidden: (message: string = 'Forbidden') =>
    createErrorResponse('FORBIDDEN', message, { status: 403 }),
  conflict: (message: string, details?: any) =>
    createErrorResponse('CONFLICT', message, { status: 409, details }),
  validationFailed: (details: any) =>
    createErrorResponse('VALIDATION_FAILED', 'Request validation failed', { status: 422, details }),
  unprocessableEntity: (message: string) =>
    createErrorResponse('UNPROCESSABLE_ENTITY', message, { status: 422 }),

  // Server errors
  internalError: (message: string = 'Internal server error', details?: any) =>
    createErrorResponse('INTERNAL_ERROR', message, { status: 500, details }),
};

/**
 * Common success response patterns - Standardized API Success Responses
 */
export const ApiResponses = {
  success: <T>(data: T, options?: { status?: number; meta?: ResponseMeta }) =>
    createSuccessResponse(data, options),
  created: <T>(data: T, options?: { meta?: ResponseMeta }) =>
    createSuccessResponse(data, { status: 201, ...options }),
  noContent: () => new NextResponse(null, { status: 204 }),
  accepted: <T>(data?: T, options?: { meta?: ResponseMeta }) =>
    createSuccessResponse(data || ({ accepted: true } as T), { status: 202, ...options }),
  collection: <T>(
    items: T[],
    pagination?: PaginationMeta,
    options?: { status?: number; meta?: Omit<ResponseMeta, 'pagination'> },
  ) => {
    if (pagination) {
      return createCollectionResponse(items, pagination, options);
    }
    return createSimpleCollectionResponse(items, options);
  },
};

/**
 * Create a successful API response with standardized envelope
 */
export function createSuccessResponse<T>(
  data: T,
  options?: {
    status?: number;
    meta?: ResponseMeta;
  },
): NextResponse {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...options?.meta,
    },
  };

  return NextResponse.json(response, { status: options?.status || 200 });
}

/**
 * Create a collection response with pagination
 */
export function createCollectionResponse<T>(
  items: T[],
  pagination: PaginationMeta,
  options?: {
    status?: number;
    meta?: Omit<ResponseMeta, 'pagination'>;
  },
): NextResponse {
  const collectionData: CollectionResponse<T> = {
    items,
    pagination,
  };

  const response: ApiSuccessResponse<CollectionResponse<T>> = {
    success: true,
    data: collectionData,
    meta: {
      timestamp: new Date().toISOString(),
      pagination,
      ...options?.meta,
    },
  };

  return NextResponse.json(response, { status: options?.status || 200 });
}

/**
 * Create a simple collection response (no pagination)
 */
export function createSimpleCollectionResponse<T>(
  items: T[],
  options?: {
    status?: number;
    meta?: ResponseMeta;
  },
): NextResponse {
  const response: ApiSuccessResponse<T[]> = {
    success: true,
    data: items,
    meta: {
      timestamp: new Date().toISOString(),
      ...options?.meta,
    },
  };

  return NextResponse.json(response, { status: options?.status || 200 });
}

/**
 * Create an error response with standardized envelope
 */
export function createErrorResponse(
  code: string,
  message: string,
  options?: {
    status?: number;
    details?: any;
    meta?: ResponseMeta;
  },
): NextResponse {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details: options?.details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...options?.meta,
    },
  };

  return NextResponse.json(response, { status: options?.status || 500 });
}

/**
 * Response transformation utilities
 */
export class ResponseTransformer {
  /**
   * Transform core service data to web API format
   */
  static transformProject(coreProject: any) {
    return {
      id: coreProject.id, // Keep as number - don't convert to string
      name: coreProject.name,
      description: coreProject.description,
      tags: coreProject.tags || [],
      createdAt: coreProject.createdAt.toISOString(),
      updatedAt: coreProject.lastAccessedAt.toISOString(),
    };
  }

  /**
   * Transform multiple projects
   */
  static transformProjects(coreProjects: any[]) {
    return coreProjects.map(this.transformProject);
  }

  /**
   * Transform devlog entry
   */
  static transformDevlog(coreDevlog: any) {
    return {
      ...coreDevlog,
      createdAt:
        typeof coreDevlog.createdAt === 'string'
          ? coreDevlog.createdAt
          : coreDevlog.createdAt.toISOString(),
      updatedAt:
        typeof coreDevlog.updatedAt === 'string'
          ? coreDevlog.updatedAt
          : coreDevlog.updatedAt.toISOString(),
    };
  }

  /**
   * Transform multiple devlogs
   */
  static transformDevlogs(coreDevlogs: any[]) {
    return coreDevlogs.map(this.transformDevlog);
  }
}

/**
 * Error handling wrapper for API routes with standardized error responses
 */
export function withErrorHandling<T extends any[]>(handler: (...args: T) => Promise<NextResponse>) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error(`API Error:`, error);

      if (error instanceof Error) {
        // Handle known error types
        if (error.message.includes('not found') || error.message.includes('Not found')) {
          return ApiErrors.notFound();
        }
        if (error.message.includes('Invalid') || error.message.includes('invalid')) {
          return ApiErrors.invalidRequest(error.message);
        }
        if (error.message.includes('duplicate') || error.message.includes('already exists')) {
          return ApiErrors.conflict(error.message);
        }
        if (error.message.includes('validation') || error.message.includes('Validation')) {
          return ApiErrors.validationFailed({ message: error.message });
        }

        return ApiErrors.internalError(error.message);
      }

      return ApiErrors.internalError();
    }
  };
}
