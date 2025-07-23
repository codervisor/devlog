/**
 * MCP tool utility functions for consistent error handling and response formatting
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Extract error message with consistent fallback pattern
 */
export function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Create standardized error response for MCP tools
 */
export function createErrorResponse(operation: string, error: unknown): CallToolResult {
  const errorMessage = extractErrorMessage(error);
  return {
    content: [
      {
        type: 'text',
        text: `Error ${operation}: ${errorMessage}`,
      },
    ],
  };
}

/**
 * Create standardized success response for MCP tools
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
 * Wrap MCP tool execution with standardized error handling
 */
export async function wrapToolExecution<T>(
  operation: () => Promise<T>,
  operationName: string,
  // eslint-disable-next-line no-unused-vars
  successFormatter: (result: T) => string,
): Promise<CallToolResult> {
  try {
    const result = await operation();
    return createSuccessResponse(successFormatter(result));
  } catch (error: unknown) {
    return createErrorResponse(operationName, error);
  }
}

/**
 * Validate required parameters for MCP tool calls
 */
export function validateRequiredParams(
  params: Record<string, unknown>,
  requiredFields: string[],
  toolName: string,
): void {
  for (const field of requiredFields) {
    if (!(field in params) || params[field] === undefined || params[field] === null) {
      throw new Error(`Missing required parameter '${field}' for tool '${toolName}'`);
    }
  }
}

/**
 * Format object for display in MCP tool responses
 */
export function formatObjectForDisplay(obj: unknown, indentLevel = 0): string {
  if (obj === null || obj === undefined) {
    return 'null';
  }

  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    const indent = '  '.repeat(indentLevel);
    const items = obj
      .map((item) => `${indent}  - ${formatObjectForDisplay(item, indentLevel + 1)}`)
      .join('\n');
    return `\n${items}`;
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}';

    const indent = '  '.repeat(indentLevel);
    const props = entries
      .map(([key, value]) => `${indent}  ${key}: ${formatObjectForDisplay(value, indentLevel + 1)}`)
      .join('\n');
    return `\n${props}`;
  }

  return String(obj);
}

/**
 * Truncate text for display with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format timestamp for human readable display
 */
export function formatTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleString();
}

/**
 * Create pagination info string for MCP responses
 */
export function formatPaginationInfo(current: number, total: number, limit: number): string {
  const start = (current - 1) * limit + 1;
  const end = Math.min(current * limit, total);
  return `Showing ${start}-${end} of ${total} results`;
}
