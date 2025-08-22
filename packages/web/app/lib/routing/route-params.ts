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
   * @deprecated
   */
  parseProjectParams(params: { id: string }): ParsedProjectParams {
    return parseProjectIdentifier(params.id, 'project identifier');
  },
};
