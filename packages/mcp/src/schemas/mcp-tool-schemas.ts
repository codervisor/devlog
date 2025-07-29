/**
 * MCP Tool validation schemas
 *
 * This module defines Zod schemas for validating MCP tool arguments.
 * It reuses business logic schemas from @codervisor/devlog-core and adds
 * MCP-specific validation layers.
 */

import { z } from 'zod';
import {
  CreateDevlogEntrySchema,
  UpdateDevlogEntrySchema,
  DevlogIdSchema,
  DevlogFilterSchema,
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
  ProjectIdSchema,
} from '@codervisor/devlog-core';

/**
 * Devlog tool argument schemas
 */
export const CreateDevlogArgsSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    type: z.enum(['feature', 'bugfix', 'task', 'refactor', 'docs']),
    description: z.string().min(1, 'Description is required'),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    businessContext: z.string().optional(),
    technicalContext: z.string().optional(),
    acceptanceCriteria: z.array(z.string()).optional(),
  })
  .transform((data) => ({
    ...data,
    priority: data.priority ?? ('medium' as const),
  }));

export const UpdateDevlogArgsSchema = z.object({
  id: DevlogIdSchema,
  status: z
    .enum(['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'])
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  businessContext: z.string().optional(),
  technicalContext: z.string().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
});

export const GetDevlogArgsSchema = z.object({
  id: DevlogIdSchema,
});

export const ListDevlogsArgsSchema = z.object({
  status: z
    .enum(['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'])
    .optional(),
  type: z.enum(['feature', 'bugfix', 'task', 'refactor', 'docs']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  archived: z.boolean().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status', 'title']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const SearchDevlogsArgsSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  status: z
    .enum(['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'])
    .optional(),
  type: z.enum(['feature', 'bugfix', 'task', 'refactor', 'docs']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  archived: z.boolean().optional(),
});

export const AddDevlogNoteArgsSchema = z
  .object({
    id: DevlogIdSchema,
    note: z.string().min(1, 'Note content is required'),
    category: z.enum(['progress', 'issue', 'solution', 'idea', 'reminder', 'feedback']).optional(),
    files: z.array(z.string()).optional(),
    codeChanges: z.string().optional(),
  })
  .transform((data) => ({
    ...data,
    category: data.category ?? ('progress' as const),
  }));

export const UpdateDevlogWithNoteArgsSchema = z
  .object({
    id: DevlogIdSchema,
    status: z
      .enum(['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'])
      .optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    note: z.string().min(1, 'Note content is required'),
    category: z.enum(['progress', 'issue', 'solution', 'idea', 'reminder', 'feedback']).optional(),
    files: z.array(z.string()).optional(),
    codeChanges: z.string().optional(),
  })
  .transform((data) => ({
    ...data,
    category: data.category ?? ('progress' as const),
  }));

export const CompleteDevlogArgsSchema = z.object({
  id: DevlogIdSchema,
  summary: z.string().optional(),
});

export const CloseDevlogArgsSchema = z.object({
  id: DevlogIdSchema,
  reason: z.string().optional(),
});

export const ArchiveDevlogArgsSchema = z.object({
  id: DevlogIdSchema,
});

export const DiscoverRelatedDevlogsArgsSchema = z.object({
  workDescription: z.string().min(1, 'Work description is required'),
  workType: z.enum(['feature', 'bugfix', 'task', 'refactor', 'docs']),
  keywords: z.array(z.string()).optional(),
  scope: z.string().optional(),
});

/**
 * Project tool argument schemas
 */
export const ListProjectsArgsSchema = z.object({
  // No arguments for list projects
});

export const GetCurrentProjectArgsSchema = z.object({
  // No arguments for get current project
});

export const SwitchProjectArgsSchema = z.object({
  projectId: z.string().regex(/^\d+$/, 'Project ID must be a number'),
});

/**
 * Type exports for tool argument validation
 */
export type CreateDevlogArgs = z.infer<typeof CreateDevlogArgsSchema>;
export type UpdateDevlogArgs = z.infer<typeof UpdateDevlogArgsSchema>;
export type GetDevlogArgs = z.infer<typeof GetDevlogArgsSchema>;
export type ListDevlogsArgs = z.infer<typeof ListDevlogsArgsSchema>;
export type SearchDevlogsArgs = z.infer<typeof SearchDevlogsArgsSchema>;
export type AddDevlogNoteArgs = z.infer<typeof AddDevlogNoteArgsSchema>;
export type UpdateDevlogWithNoteArgs = z.infer<typeof UpdateDevlogWithNoteArgsSchema>;
export type CompleteDevlogArgs = z.infer<typeof CompleteDevlogArgsSchema>;
export type CloseDevlogArgs = z.infer<typeof CloseDevlogArgsSchema>;
export type ArchiveDevlogArgs = z.infer<typeof ArchiveDevlogArgsSchema>;
export type DiscoverRelatedDevlogsArgs = z.infer<typeof DiscoverRelatedDevlogsArgsSchema>;
export type ListProjectsArgs = z.infer<typeof ListProjectsArgsSchema>;
export type GetCurrentProjectArgs = z.infer<typeof GetCurrentProjectArgsSchema>;
export type SwitchProjectArgs = z.infer<typeof SwitchProjectArgsSchema>;

/**
 * Validation helper functions
 */
export class McpToolValidator {
  /**
   * Validate tool arguments against schema
   */
  static validate<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
  ): { success: true; data: T } | { success: false; errors: string[] } {
    const result = schema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    return {
      success: false,
      errors: result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
    };
  }

  /**
   * Validate and throw on error
   */
  static validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
    const result = this.validate(schema, data);
    if (!result.success) {
      throw new Error(`Validation failed: ${result.errors.join(', ')}`);
    }
    return result.data;
  }
}
