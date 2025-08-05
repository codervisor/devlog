/**
 * Devlog entry validation schemas for web API
 *
 * This module provides Zod schemas for devlog entry-related API endpoints.
 */

import { z } from 'zod';

/**
 * Devlog entry creation request body schema
 */
export const CreateDevlogBodySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['feature', 'bugfix', 'task', 'refactor', 'docs']).default('task'),
  description: z.string().min(1, 'Description is required'),
  status: z
    .enum(['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'])
    .default('new'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  key: z.string().optional(), // Semantic key
  assignee: z.string().optional(),
  archived: z.boolean().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  businessContext: z.string().optional(),
  technicalContext: z.string().optional(),
});

/**
 * Query parameter schemas for devlog endpoints
 */
export const DevlogListQuerySchema = z.object({
  // Pagination
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),

  // Filtering
  status: z
    .enum(['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'])
    .optional(),
  type: z.enum(['feature', 'bugfix', 'task', 'refactor', 'docs']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignee: z.string().optional(),
  search: z.string().optional(),
  archived: z
    .string()
    .transform((val) => val === 'true')
    .optional(),

  // Date range filtering
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),

  // Sorting
  sortBy: z.enum(['title', 'type', 'status', 'priority', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const DevlogSearchQuerySchema = DevlogListQuerySchema.extend({
  q: z.string().min(1, 'Search query is required'),
});

// Schema for adding notes
export const DevlogAddNoteBodySchema = z.object({
  note: z.string().min(1, 'Note is required'),
  category: z.string().optional().default('progress'),
});

// Schema for updating devlog with note
export const DevlogUpdateWithNoteBodySchema = z.object({
  note: z.string().min(1, 'Note is required'),
  category: z.string().optional().default('progress'),
  // Optional update fields
  status: z
    .enum(['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'])
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignee: z.string().nullable().optional(),
  businessContext: z.string().nullable().optional(),
  technicalContext: z.string().nullable().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
});
