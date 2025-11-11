/**
 * Bridge schemas for transforming web API data to service layer types
 *
 * These schemas handle the transformation from HTTP request data (unknown)
 * to properly typed service method parameters.
 */

import { z } from 'zod';

/**
 * Transform web project creation data to service layer type
 * This schema validates unknown HTTP data and transforms it to ProjectMetadata type
 */
export const WebToServiceProjectCreateSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  repositoryUrl: z.string().optional(),
  settings: z
    .object({
      defaultPriority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      theme: z.string().optional(),
      autoArchiveDays: z.number().optional(),
      availableTags: z.array(z.string()).optional(),
      customSettings: z.record(z.any()).optional(),
    })
    .optional(),
});

/**
 * Transform web project update data to service layer type
 */
export const WebToServiceProjectUpdateSchema = WebToServiceProjectCreateSchema.partial();

/**
 * Transform web devlog creation data to service layer type
 */
export const WebToServiceDevlogCreateSchema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    type: z.enum(['feature', 'bugfix', 'task', 'refactor', 'docs']).default('task'),
    description: z.string().min(1, 'Description is required'),
    status: z
      .enum(['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'])
      .default('new'),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    key: z.string().optional(),
    assignee: z.string().optional(),
    archived: z.boolean().default(false).optional(),
    acceptanceCriteria: z.array(z.string()).optional(),
    businessContext: z.string().optional(),
    technicalContext: z.string().optional(),
  })
  .transform((data) => ({
    ...data,
    // Add timestamps that will be set by the service
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

/**
 * Transform web devlog update data to service layer type
 */
export const WebToServiceDevlogUpdateSchema = z
  .object({
    title: z.string().min(1, 'Title is required').optional(),
    type: z.enum(['feature', 'bugfix', 'task', 'refactor', 'docs']).optional(),
    description: z.string().min(1, 'Description is required').optional(),
    status: z
      .enum(['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'])
      .optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    key: z.string().optional(),
    assignee: z.string().optional(),
    archived: z.boolean().optional(),
    acceptanceCriteria: z.array(z.string()).optional(),
    businessContext: z.string().optional(),
    technicalContext: z.string().optional(),
  })
  .transform((data) => ({
    ...data,
    // Add updated timestamp
    updatedAt: new Date().toISOString(),
  }));

/**
 * Type exports for the transformed data
 */
export type WebToServiceProjectCreate = z.infer<typeof WebToServiceProjectCreateSchema>;
export type WebToServiceProjectUpdate = z.infer<typeof WebToServiceProjectUpdateSchema>;
export type WebToServiceDevlogCreate = z.infer<typeof WebToServiceDevlogCreateSchema>;
export type WebToServiceDevlogUpdate = z.infer<typeof WebToServiceDevlogUpdateSchema>;
