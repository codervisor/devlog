/**
 * Centralized route parameter handling for Next.js dynamic routes
 * Provides type-safe parameter parsing and validation
 */

import { DevlogId } from '@codervisor/devlog-core';

export interface ParsedProjectParams {
  projectId: number;
}

export interface ParsedDevlogParams extends ParsedProjectParams {
  devlogId: DevlogId;
}

/**
 * Parse and validate a numeric ID parameter
 */
function parseId(value: string, paramName: string): number {
  const parsed = parseInt(value, 10);

  if (isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${paramName}: must be a positive integer`);
  }

  return parsed;
}

/**
 * Route parameter parsers for different page types
 */
export const RouteParamParsers = {
  /**
   * Parse project route parameters
   * For routes like: /projects/[id]/...
   */
  parseProjectParams(params: { id: string }): ParsedProjectParams {
    return {
      projectId: parseId(params.id, 'project ID'),
    };
  },

  /**
   * Parse project + devlog route parameters
   * For routes like: /projects/[id]/devlogs/[devlogId]/...
   */
  parseDevlogParams(params: { id: string; devlogId: string }): ParsedDevlogParams {
    return {
      projectId: parseId(params.id, 'project ID'),
      devlogId: parseId(params.devlogId, 'devlog ID') as DevlogId,
    };
  },

  /**
   * Parse single devlog ID parameter
   * For routes like: /devlogs/[id]/...
   */
  parseDevlogId(params: { id: string }): { devlogId: DevlogId } {
    return {
      devlogId: parseId(params.id, 'devlog ID') as DevlogId,
    };
  },
};

/**
 * Hook for parsing route parameters in client components
 */
export function useRouteParams<P extends Record<string, string>, T>(
  params: P,
  parser: (params: P) => T,
): T {
  try {
    return parser(params);
  } catch (error) {
    throw new Error(
      `Route parameter error: ${error instanceof Error ? error.message : 'Invalid parameters'}`,
    );
  }
}
