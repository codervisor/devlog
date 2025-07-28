/**
 * MCP Tool validation utilities
 * 
 * This module provides utilities for validating MCP tool arguments
 * using Zod schemas and generating proper error responses.
 */

import { z } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Validate tool arguments and return validated data or error result
 */
export function validateToolArgs<T>(
  schema: z.ZodSchema<T>,
  args: unknown,
  toolName: string
): { success: true; data: T } | { success: false; result: CallToolResult } {
  const result = schema.safeParse(args);
  
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
  
  return {
    success: false,
    result: {
      content: [
        {
          type: 'text',
          text: `Invalid arguments for ${toolName}:\n${errors.join('\n')}`,
        },
      ],
      isError: true,
    },
  };
}

/**
 * Create a standardized error response for tool validation failures
 */
export function createValidationErrorResponse(
  toolName: string,
  errors: string[]
): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: `❌ Validation failed for ${toolName}:\n\n${errors.map(err => `• ${err}`).join('\n')}\n\nPlease check your arguments and try again.`,
      },
    ],
    isError: true,
  };
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse(message: string): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: message,
      },
    ],
  };
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(message: string, error?: unknown): CallToolResult {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const fullMessage = error ? `${message}: ${errorMessage}` : message;
  
  return {
    content: [
      {
        type: 'text',
        text: `❌ ${fullMessage}`,
      },
    ],
    isError: true,
  };
}
