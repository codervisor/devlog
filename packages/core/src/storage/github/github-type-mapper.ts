/**
 * Shared GitHub type mapping utilities
 * Consolidates duplicated type mapping logic from github-storage.ts and github-mapper.ts
 */

import type { DevlogType } from '../../types/index.js';

/**
 * Map devlog type to GitHub native type
 */
export function mapDevlogTypeToGitHubType(devlogType: DevlogType | string): string {
  switch (devlogType) {
    case 'bugfix':
      return 'bug';
    case 'feature':
      return 'enhancement';
    case 'docs':
      return 'documentation';
    case 'refactor':
      return 'refactor';
    case 'task':
      return 'task';
    default:
      return devlogType;
  }
}

/**
 * Map devlog type to GitHub label (for custom labeling)
 */
export function mapDevlogTypeToGitHubLabel(devlogType: DevlogType | string): string {
  switch (devlogType) {
    case 'bugfix':
      return 'bug';
    case 'feature':
      return 'enhancement';
    case 'docs':
      return 'documentation';
    case 'refactor':
      return 'refactor';
    case 'task':
      return 'task';
    default:
      return devlogType;
  }
}

/**
 * Map GitHub native type to devlog type
 */
export function mapGitHubTypeToDevlogType(githubType: string | { name: string }): DevlogType {
  // Handle both string and object inputs
  const typeString = typeof githubType === 'string' ? githubType : githubType.name;
  const normalizedType = typeString.toLowerCase();

  switch (normalizedType) {
    case 'bug':
      return 'bugfix';
    case 'enhancement':
    case 'feature':
      return 'feature';
    case 'documentation':
    case 'docs':
      return 'docs';
    case 'refactor':
    case 'refactoring':
      return 'refactor';
    case 'task':
    case 'chore':
      return 'task';
    default:
      return 'task';
  }
}

/**
 * Map native GitHub labels to devlog type
 */
export function mapNativeLabelsToDevlogType(labels: string[]): DevlogType {
  for (const label of labels) {
    const normalizedLabel = label.toLowerCase();
    switch (normalizedLabel) {
      case 'bug':
        return 'bugfix';
      case 'enhancement':
      case 'feature':
        return 'feature';
      case 'documentation':
      case 'docs':
        return 'docs';
      case 'refactor':
      case 'refactoring':
        return 'refactor';
      case 'task':
      case 'chore':
        return 'task';
    }
  }
  return 'task'; // Default fallback
}
