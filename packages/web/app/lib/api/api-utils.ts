/**
 * API utilities for handling common patterns in Next.js API routes
 * Consolidated utilities for parameter parsing, service helpers, and response handling
 */

import { NextResponse } from 'next/server';
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  CollectionResponse,
  ResponseMeta,
} from '@/schemas/responses';
import { PaginationMeta } from '@codervisor/devlog-core';
import { isValidProjectIdentifier } from '@codervisor/devlog-core';
import { broadcastUpdate } from '@/lib/api/server-realtime';

/**
 * Type-safe parameter parser for API routes
 */
export const RouteParams = {
  /**
   * Parse project name parameter (name-only routing)
   * Usage: /api/projects/[name]
   */
  parseProjectId(params: { id: string }) {
    try {
      const validation = isValidProjectIdentifier(params.id);

      if (!validation.valid) {
        return {
          success: false as const,
          response: NextResponse.json(
            { error: 'Invalid project name: must follow GitHub naming conventions' },
            { status: 400 },
          ),
        };
      }

      // Always name-based routing now
      return {
        success: true as const,
        data: {
          projectId: -1, // Will be resolved by service helper
          identifier: params.id,
          identifierType: 'name' as const,
        },
      };
    } catch (error) {
      return {
        success: false as const,
        response: NextResponse.json({ error: 'Invalid project name format' }, { status: 400 }),
      };
    }
  },

  /**
   * Parse project name and devlog ID parameters (name-only routing for projects)
   * Usage: /api/projects/[name]/devlogs/[devlogId]
   */
  parseProjectAndDevlogId(params: { id: string; devlogId: string }) {
    try {
      const projectValidation = isValidProjectIdentifier(params.id);
      const devlogId = parseInt(params.devlogId, 10);

      if (!projectValidation.valid) {
        return {
          success: false as const,
          response: NextResponse.json(
            { error: 'Invalid project name: must follow GitHub naming conventions' },
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

      // Always name-based routing for projects now
      return {
        success: true as const,
        data: {
          projectId: -1, // Will be resolved by service helper
          devlogId,
          identifier: params.id,
          identifierType: 'name' as const,
        },
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
   * Get project by ID and ensure it exists
   */
  static async getProjectOrFail(projectId: number) {
    const { ProjectService } = await import('@codervisor/devlog-core/server');
    const projectService = ProjectService.getInstance();
    const project = await projectService.get(projectId);
    if (!project) {
      return { success: false as const, response: ApiErrors.projectNotFound() };
    }

    return { success: true as const, data: { project, projectService } };
  }

  /**
   * Get project by name and ensure it exists (case-insensitive lookup)
   */
  static async getProjectByIdentifierOrFail(identifier: string, identifierType: 'name') {
    const { ProjectService } = await import('@codervisor/devlog-core/server');
    const projectService = ProjectService.getInstance();

    // Only name-based routing supported now
    const project = await projectService.getByName(identifier);

    if (!project) {
      return { success: false as const, response: ApiErrors.projectNotFound() };
    }

    return { success: true as const, data: { project, projectService } };
  }

  /**
   * Get devlog service for a project
   */
  static async getDevlogService(projectId: number) {
    const { DevlogService } = await import('@codervisor/devlog-core/server');
    return DevlogService.getInstance(projectId);
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
    sseEventType?: string;
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

  if (options?.sseEventType) {
    setTimeout(() => {
      broadcastUpdate(options.sseEventType!, data);
    }, 0);
  }

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
