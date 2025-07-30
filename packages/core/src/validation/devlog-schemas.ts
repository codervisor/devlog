/**
 * Devlog validation schemas using Zod
 *
 * This module provides runtime validation for devlog-related data at the business logic layer.
 * It ensures data integrity and business rule compliance across all entry points.
 */

import { z } from 'zod';
import type { DevlogEntry, DevlogFilter } from '../types/core.js';

/**
 * Devlog entry validation schema (for save operations)
 */
export const DevlogEntrySchema = z.object({
  id: z.number().int().positive().optional(),
  key: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  type: z.enum(['feature', 'bugfix', 'task', 'refactor', 'docs']),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(2000, 'Description must be less than 2000 characters'),
  status: z.enum(['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  createdAt: z.string().datetime('Invalid createdAt timestamp'),
  updatedAt: z.string().datetime('Invalid updatedAt timestamp'),
  closedAt: z.string().datetime('Invalid closedAt timestamp').nullable().optional(),
  assignee: z.string().nullable().optional(),
  archived: z.boolean().optional(),
  projectId: z.number().int().positive(),
  acceptanceCriteria: z.array(z.string()).optional(),
  businessContext: z.string().max(10000, 'Business context too long').nullable().optional(),
  technicalContext: z.string().max(10000, 'Technical context too long').nullable().optional(),
  notes: z.array(z.any()).optional(), // Notes have their own validation
  dependencies: z.array(z.any()).optional(), // Dependencies have their own validation
}) satisfies z.ZodType<DevlogEntry>;

/**
 * Devlog creation schema (excludes auto-generated fields)
 */
export const CreateDevlogEntrySchema = z.object({
  key: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  type: z.enum(['feature', 'bugfix', 'task', 'refactor', 'docs']),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(2000, 'Description must be less than 2000 characters'),
  status: z
    .enum(['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'])
    .default('new'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  assignee: z.string().nullable().optional(),
  archived: z.boolean().default(false).optional(),
  projectId: z.number().int().positive().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  businessContext: z.string().max(10000, 'Business context too long').nullable().optional(),
  technicalContext: z.string().max(10000, 'Technical context too long').nullable().optional(),
});

/**
 * Devlog update schema (all fields optional except restrictions)
 */
export const UpdateDevlogEntrySchema = z.object({
  key: z.string().optional(),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  type: z.enum(['feature', 'bugfix', 'task', 'refactor', 'docs']).optional(),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  status: z
    .enum(['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'])
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignee: z.string().nullable().optional(),
  archived: z.boolean().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  businessContext: z.string().max(10000, 'Business context too long').nullable().optional(),
  technicalContext: z.string().max(10000, 'Technical context too long').nullable().optional(),
});

/**
 * Devlog ID validation schema
 */
export const DevlogIdSchema = z.number().int().positive('Devlog ID must be a positive integer');

/**
 * Devlog filter validation schema
 */
export const DevlogFilterSchema = z.object({
  filterType: z
    .enum([
      'new',
      'in-progress',
      'blocked',
      'in-review',
      'testing',
      'done',
      'cancelled',
      'total',
      'open',
      'closed',
    ])
    .optional(),
  status: z
    .array(z.enum(['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled']))
    .optional(),
  type: z.array(z.enum(['feature', 'bugfix', 'task', 'refactor', 'docs'])).optional(),
  priority: z.array(z.enum(['low', 'medium', 'high', 'critical'])).optional(),
  assignee: z.string().nullable().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  search: z.string().optional(),
  archived: z.boolean().optional(),
  projectId: z.number().int().positive().optional(),
  pagination: z
    .object({
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    })
    .optional(),
});

/**
 * Validation functions for business logic layer
 */
export class DevlogValidator {
  /**
   * Validate complete devlog entry (for save operations)
   */
  static validateDevlogEntry(data: unknown):
    | {
        success: true;
        data: z.infer<typeof DevlogEntrySchema>;
      }
    | {
        success: false;
        errors: string[];
      } {
    const result = DevlogEntrySchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    return {
      success: false,
      errors: result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
    };
  }

  /**
   * Validate devlog creation data
   */
  static validateCreateRequest(data: unknown):
    | {
        success: true;
        data: z.infer<typeof CreateDevlogEntrySchema>;
      }
    | {
        success: false;
        errors: string[];
      } {
    const result = CreateDevlogEntrySchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    return {
      success: false,
      errors: result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
    };
  }

  /**
   * Validate devlog update data
   */
  static validateUpdateRequest(data: unknown):
    | {
        success: true;
        data: z.infer<typeof UpdateDevlogEntrySchema>;
      }
    | {
        success: false;
        errors: string[];
      } {
    const result = UpdateDevlogEntrySchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    return {
      success: false,
      errors: result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
    };
  }

  /**
   * Validate devlog ID
   */
  static validateDevlogId(id: unknown):
    | {
        success: true;
        data: number;
      }
    | {
        success: false;
        errors: string[];
      } {
    const result = DevlogIdSchema.safeParse(id);

    if (result.success) {
      return { success: true, data: result.data };
    }

    return {
      success: false,
      errors: [`Invalid devlog ID: ${result.error.errors.map((err) => err.message).join(', ')}`],
    };
  }

  /**
   * Validate devlog filter
   */
  static validateFilter(data: unknown):
    | {
        success: true;
        data: z.infer<typeof DevlogFilterSchema>;
      }
    | {
        success: false;
        errors: string[];
      } {
    const result = DevlogFilterSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    return {
      success: false,
      errors: result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
    };
  }

  /**
   * Business rule validation - check for duplicate keys within project
   */
  static async validateUniqueKey(
    key: string,
    projectId: number,
    excludeId?: number,
    checkFunction?: (key: string, projectId: number, excludeId?: number) => Promise<boolean>,
  ): Promise<{ success: boolean; error?: string }> {
    if (!checkFunction) {
      return { success: true }; // Skip if no check function provided
    }

    const isDuplicate = await checkFunction(key, projectId, excludeId);
    if (isDuplicate) {
      return {
        success: false,
        error: `Devlog with key "${key}" already exists in this project`,
      };
    }

    return { success: true };
  }
}

/**
 * Type exports for use in other modules
 */
export type CreateDevlogValidationRequest = z.infer<typeof CreateDevlogEntrySchema>;
export type UpdateDevlogValidationRequest = z.infer<typeof UpdateDevlogEntrySchema>;
export type ValidatedDevlogEntry = z.infer<typeof DevlogEntrySchema>;
export type ValidatedDevlogFilter = z.infer<typeof DevlogFilterSchema>;
