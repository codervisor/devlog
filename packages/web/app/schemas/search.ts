/**
 * Search-specific validation schemas for web API
 *
 * This module provides Zod schemas for search-related API endpoints.
 */

import { z } from 'zod';

/**
 * Search query parameter schema for devlog search endpoint
 */
export const DevlogSearchQuerySchema = z.object({
  // Required search query
  q: z.string().min(1, 'Search query is required'),

  // Optional filters
  status: z
    .enum(['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'])
    .optional(),
  type: z.enum(['feature', 'bugfix', 'task', 'refactor', 'docs']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignee: z.string().optional(),
  archived: z
    .string()
    .transform((val) => val === 'true')
    .optional(),

  // Date range filtering
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),

  // Pagination
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),

  // Sorting
  sortBy: z
    .enum(['title', 'type', 'status', 'priority', 'createdAt', 'updatedAt', 'relevance'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),

  // Search options
  includeNotes: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  exactMatch: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});

/**
 * Enhanced search result schema with relevance scoring
 */
export const SearchResultSchema = z.object({
  entry: z.any(), // DevlogEntry
  relevance: z.number().min(0).max(1),
  matchedFields: z.array(z.string()),
  highlights: z.record(z.string()).optional(),
});

/**
 * Search response schema
 */
export const SearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(SearchResultSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasPreviousPage: z.boolean(),
    hasNextPage: z.boolean(),
  }),
  searchMeta: z.object({
    searchTime: z.number(), // milliseconds
    totalMatches: z.number(),
    appliedFilters: z.record(z.any()).optional(),
  }),
});

/**
 * Type exports for TypeScript usage
 */
export type DevlogSearchQuery = z.infer<typeof DevlogSearchQuerySchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
