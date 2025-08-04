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

export type DevlogSearchQuery = z.infer<typeof DevlogSearchQuerySchema>;
