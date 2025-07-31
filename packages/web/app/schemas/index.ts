/**
 * Centralized schema exports for web API validation
 *
 * This module provides a single entry point for all validation schemas
 * used across the web application's API endpoints.
 */

// Re-export all schemas and utilities
export * from './project';
export * from './devlog';
export * from './search';
export * from './validation';
export * from './bridge';
export * from './responses';

// Common schemas that might be used across multiple endpoints
import { z } from 'zod';

/**
 * Common parameter schemas
 */
export const PaginationQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export const SortQuerySchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const SearchQuerySchema = z.object({
  search: z.string().optional(),
});

/**
 * Common response schemas
 */
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.any().optional(),
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.any().optional(),
});

/**
 * Type exports for common schemas
 */
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type SortQuery = z.infer<typeof SortQuerySchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
