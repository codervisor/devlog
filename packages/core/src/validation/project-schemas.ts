/**
 * Project validation schemas using Zod
 *
 * This module provides runtime validation for project-related data at the business logic layer.
 * It ensures data integrity and business rule compliance across all entry points.
 */

import { z } from 'zod';
import type { ProjectMetadata } from '../types/project.js';

/**
 * Project creation request schema (excludes auto-generated fields)
 */
export const CreateProjectRequestSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be less than 100 characters')
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      'Project name can only contain letters, numbers, spaces, hyphens, and underscores',
    ),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
}) satisfies z.ZodType<Omit<ProjectMetadata, 'id' | 'createdAt' | 'lastAccessedAt'>>;

/**
 * Project update request schema (all fields optional)
 */
export const UpdateProjectRequestSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be less than 100 characters')
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      'Project name can only contain letters, numbers, spaces, hyphens, and underscores',
    )
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')), // Allow empty string to clear description
}) satisfies z.ZodType<Partial<Omit<ProjectMetadata, 'id' | 'createdAt' | 'lastAccessedAt'>>>;

/**
 * Project ID parameter schema
 */
export const ProjectIdSchema = z.object({
  id: z.number().int().positive('Project ID must be a positive integer'),
});

/**
 * Validation functions for business logic layer
 */
export class ProjectValidator {
  /**
   * Validate project creation data
   */
  static validateCreateRequest(data: unknown):
    | {
        success: true;
        data: z.infer<typeof CreateProjectRequestSchema>;
      }
    | {
        success: false;
        errors: string[];
      } {
    const result = CreateProjectRequestSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    return {
      success: false,
      errors: result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
    };
  }

  /**
   * Validate project update data
   */
  static validateUpdateRequest(data: unknown):
    | {
        success: true;
        data: z.infer<typeof UpdateProjectRequestSchema>;
      }
    | {
        success: false;
        errors: string[];
      } {
    const result = UpdateProjectRequestSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    return {
      success: false,
      errors: result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
    };
  }

  /**
   * Validate project ID
   */
  static validateProjectId(id: unknown):
    | {
        success: true;
        data: number;
      }
    | {
        success: false;
        errors: string[];
      } {
    const result = ProjectIdSchema.safeParse({ id });

    if (result.success) {
      return { success: true, data: result.data.id };
    }

    return {
      success: false,
      errors: result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
    };
  }

  /**
   * Business rule validation - check for duplicate project names
   */
  static async validateUniqueProjectName(
    name: string,
    excludeId?: number,
    checkFunction?: (name: string, excludeId?: number) => Promise<boolean>,
  ): Promise<{ success: boolean; error?: string }> {
    if (!checkFunction) {
      return { success: true }; // Skip if no check function provided
    }

    const isDuplicate = await checkFunction(name, excludeId);
    if (isDuplicate) {
      return {
        success: false,
        error: `Project with name "${name}" already exists`,
      };
    }

    return { success: true };
  }
}

/**
 * Type exports for use in other modules
 */
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;
export type ValidatedProjectId = z.infer<typeof ProjectIdSchema>;
