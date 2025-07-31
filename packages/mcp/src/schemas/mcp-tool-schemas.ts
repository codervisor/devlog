/**
 * MCP Tool validation schemas
 *
 * This module defines Zod schemas for validating MCP tool arguments.
 * It reuses business logic schemas from @codervisor/devlog-core and adds
 * MCP-specific validation layers.
 */

import { z } from 'zod';

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
