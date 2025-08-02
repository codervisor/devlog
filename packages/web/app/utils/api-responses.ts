/**
 * API response utilities for consistent response formatting
 *
 * This module provides utility functions to create standardized API responses
 * across all endpoints in the web application.
 */

import { NextResponse } from 'next/server';
import type { ApiErrorResponse, ResponseMeta } from '@/schemas/responses';

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
