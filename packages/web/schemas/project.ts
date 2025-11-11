/**
 * Project-related validation schemas for web API
 *
 * This module provides Zod schemas specifically for HTTP API validation.
 * It focuses on request/response format validation and HTTP-specific concerns.
 */

import { z } from 'zod';
import { validateProjectDisplayName, isValidProjectIdentifier } from '@codervisor/devlog-core';

/**
 * Project name parameter validation (from URL params) - name-only routing
 */
export const ProjectIdParamSchema = z
  .object({
    id: z.string().min(1, 'Project name is required'),
  })
  .refine(
    (data) => isValidProjectIdentifier(data.id).valid,
    'Project name must follow GitHub naming conventions',
  );

/**
 * Project creation request body schema
 */
export const CreateProjectBodySchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .refine(
      validateProjectDisplayName,
      'The repository name can only contain ASCII letters, digits, and the characters -, ., and _.',
    ),
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
 * Project update request body schema (all fields optional)
 */
export const UpdateProjectBodySchema = CreateProjectBodySchema.partial();

/**
 * Query parameter schemas for project endpoints
 */
export const ProjectListQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
