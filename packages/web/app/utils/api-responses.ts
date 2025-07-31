/**
 * API response utilities for consistent response formatting
 *
 * This module provides utility functions to create standardized API responses
 * across all endpoints in the web application.
 */

import { NextResponse } from 'next/server';
import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  CollectionResponse,
  PaginationMeta,
  ResponseMeta,
} from '@/schemas/responses';

/**
 * Create a successful API response
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
 * Create an error response
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
 * Common error responses
 */
export const ApiErrors = {
  notFound: (resource: string, id?: string | number) =>
    createErrorResponse(
      'RESOURCE_NOT_FOUND',
      `${resource}${id ? ` with ID ${id}` : ''} not found`,
      { status: 404 },
    ),

  badRequest: (message: string, details?: any) =>
    createErrorResponse('BAD_REQUEST', message, { status: 400, details }),

  unauthorized: (message = 'Unauthorized') =>
    createErrorResponse('UNAUTHORIZED', message, { status: 401 }),

  forbidden: (message = 'Forbidden') => createErrorResponse('FORBIDDEN', message, { status: 403 }),

  conflict: (message: string, details?: any) =>
    createErrorResponse('CONFLICT', message, { status: 409, details }),

  validationFailed: (details: any) =>
    createErrorResponse('VALIDATION_FAILED', 'Request validation failed', { status: 422, details }),

  internalError: (message = 'Internal server error', details?: any) =>
    createErrorResponse('INTERNAL_ERROR', message, { status: 500, details }),
};

/**
 * Legacy response format helpers (for backward compatibility)
 */
export function createLegacyProjectsResponse(projects: any[]): NextResponse {
  return NextResponse.json({ projects });
}

export function createLegacyPaginatedResponse<T>(
  items: T[],
  pagination?: PaginationMeta,
): NextResponse {
  if (pagination) {
    return NextResponse.json({
      items,
      pagination,
      totalCount: pagination.total,
      page: pagination.page,
      limit: pagination.limit,
    });
  }

  return NextResponse.json({ items });
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
