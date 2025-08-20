/**
 * Centralized route parameter handling for Next.js dynamic routes
 * Provides type-safe parameter parsing and validation
 */

import { DevlogId } from '@codervisor/devlog-core';
import { isValidProjectIdentifier, generateSlugFromName } from '@codervisor/devlog-core';

export interface ParsedProjectParams {
  projectId: number;
  projectIdentifier: string; // The project name
  identifierType: 'name';
}

export interface ParsedDevlogParams extends ParsedProjectParams {
  devlogId: DevlogId;
}

/**
 * Parse and validate a project name (name-only routing)
 */
function parseProjectIdentifier(
  value: string,
  paramName: string,
): {
  projectId: number;
  projectIdentifier: string;
  identifierType: 'name';
} {
  const validation = isValidProjectIdentifier(value);

  if (!validation.valid) {
    throw new Error(
      `Invalid ${paramName}: must be a valid project name following GitHub naming conventions`,
    );
  }

  // Always name-based identifiers now
  return {
    projectId: -1, // Will be resolved later by service helper
    projectIdentifier: value,
    identifierType: 'name',
  };
}

/**
 * Parse and validate a numeric ID parameter (for devlog IDs)
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
   * For routes like: /projects/[name]/...
   */
  parseProjectParams(params: { id: string }): ParsedProjectParams {
    return parseProjectIdentifier(params.id, 'project identifier');
  },

  /**
   * Parse project + devlog route parameters
   * For routes like: /projects/[name]/devlogs/[devlogId]/...
   */
  parseDevlogParams(params: { id: string; devlogId: string }): ParsedDevlogParams {
    const projectInfo = parseProjectIdentifier(params.id, 'project identifier');
    return {
      ...projectInfo,
      devlogId: parseId(params.devlogId, 'devlog ID') as DevlogId,
    };
  },

  /**
   * Parse single devlog ID parameter
   * For routes like: /devlogs/[name]/...
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
