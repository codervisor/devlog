/**
 * Standardized API response schemas and types
 *
 * This module defines the standard response envelope for all web API endpoints.
 * It ensures consistency across all API responses and provides type safety.
 */

import { z } from 'zod';
import { PaginationMeta } from '@codervisor/devlog-core';

/**
 * Pagination metadata schema
 */
export const PaginationMetaSchema: z.ZodType<PaginationMeta> = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

/**
 * Response metadata schema
 */
export const ResponseMetaSchema = z
  .object({
    pagination: PaginationMetaSchema.optional(),
    timestamp: z.string().optional(),
    version: z.string().optional(),
    requestId: z.string().optional(),
  })
  .optional();

export type ResponseMeta = z.infer<typeof ResponseMetaSchema>;

/**
 * Standard success response schema
 */
export const ApiSuccessResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: ResponseMetaSchema,
  });

/**
 * Standard error response schema
 */
export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
  meta: ResponseMetaSchema,
});

/**
 * Collection response schema for paginated lists
 */
export const CollectionResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    pagination: PaginationMetaSchema,
  });

/**
 * TypeScript types for response envelopes
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: ResponseMeta;
}

export interface CollectionResponse<T = any> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * Union type for all possible API responses
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Legacy response types (for backward compatibility during migration)
 */
export interface LegacyProjectsResponse {
  projects: any[];
}

export interface LegacyPaginatedResponse<T = any> {
  items: T[];
  pagination?: PaginationMeta;
  totalCount?: number;
  page?: number;
  limit?: number;
}
