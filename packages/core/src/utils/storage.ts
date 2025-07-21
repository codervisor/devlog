import path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import {
  DevlogEntry,
  DevlogPriority,
  DevlogStats,
  DevlogStatus,
  DevlogType,
} from '../types/index.js';
import { parseBoolean } from './common.js';

export function getWorkspaceRoot(startPath: string = process.cwd()): string {
  if (process.env.NODE_ENV === 'production') {
    // Detect serverless environments where filesystem is read-only
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY) {
      // Use /tmp directory in serverless environments for write operations
      return path.join(os.tmpdir(), 'devlog-serverless');
    }
    // Use working directory in production
    return process.cwd();
  } else if (parseBoolean(process.env.UNIT_TEST)) {
    // Use temporary directory in unit tests
    return fs.mkdtempSync(path.join(os.tmpdir(), 'devlog-test'));
  } else {
    // Use project root in development
    return findProjectRoot(startPath);
  }
}

/**
 * Find the project root directory by looking for common project indicators
 * @param startPath Starting directory (defaults to current working directory)
 * @throws Error if no project root is found
 * @returns The project root path
 */
export function findProjectRoot(startPath: string = process.cwd()): string {
  let currentDir = path.resolve(startPath);

  while (currentDir !== path.dirname(currentDir)) {
    // Check for strong monorepo indicators first (these take priority)
    const strongIndicators = [
      path.join(currentDir, 'pnpm-workspace.yaml'),
      path.join(currentDir, 'lerna.json'),
      path.join(currentDir, 'nx.json'),
      path.join(currentDir, 'rush.json'),
    ];

    for (const indicator of strongIndicators) {
      if (fs.existsSync(indicator)) {
        return currentDir;
      }
    }

    // Check for basic project indicators (package.json, etc.)
    const basicIndicators = [
      path.join(currentDir, 'package.json'),
      path.join(currentDir, 'pyproject.toml'),
      path.join(currentDir, 'Cargo.toml'),
      path.join(currentDir, 'composer.json'),
    ];

    for (const indicator of basicIndicators) {
      if (fs.existsSync(indicator)) {
        // Found a basic project file, use this as fallback but continue looking for stronger indicators
        const potentialRoot = currentDir;

        // Check parent directories for stronger indicators
        let parentDir = path.dirname(currentDir);
        let foundStrongerIndicator = false;

        while (parentDir !== path.dirname(parentDir)) {
          // Check for strong monorepo indicators in parent
          const parentStrongIndicators = [
            path.join(parentDir, 'pnpm-workspace.yaml'),
            path.join(parentDir, 'lerna.json'),
            path.join(parentDir, 'nx.json'),
            path.join(parentDir, 'rush.json'),
          ];

          for (const strongIndicator of parentStrongIndicators) {
            if (fs.existsSync(strongIndicator)) {
              foundStrongerIndicator = true;
              break;
            }
          }

          if (foundStrongerIndicator) break;
          parentDir = path.dirname(parentDir);
        }

        // If no stronger indicator found above, use this directory
        if (!foundStrongerIndicator) {
          return potentialRoot;
        }
      }
    }

    // Check for git root (but continue searching if we find a monorepo indicator later)
    const gitDir = path.join(currentDir, '.git');
    let gitRoot: string | null = null;
    if (fs.existsSync(gitDir)) {
      gitRoot = currentDir;
    }

    // Check if this directory contains workspace packages
    const packagesDir = path.join(currentDir, 'packages');
    if (fs.existsSync(packagesDir) && fs.statSync(packagesDir).isDirectory()) {
      // This looks like a monorepo root
      return currentDir;
    }

    // If we found a git root but no strong indicators, use it as fallback
    if (gitRoot) {
      // Look ahead to see if there's a monorepo indicator in parent directories
      let tempDir = path.dirname(currentDir);
      let foundMonorepoAbove = false;

      while (tempDir !== path.dirname(tempDir)) {
        for (const indicator of strongIndicators) {
          if (fs.existsSync(path.join(tempDir, indicator))) {
            foundMonorepoAbove = true;
            break;
          }
        }
        if (foundMonorepoAbove) break;
        tempDir = path.dirname(tempDir);
      }

      // If no monorepo found above, use git root
      if (!foundMonorepoAbove) {
        return gitRoot;
      }
    }

    currentDir = path.dirname(currentDir);
  }

  throw new Error(`Unable to find project root for ${startPath}`);
}

/**
 * Calculate devlog statistics from a list of entries
 * This is shared logic used by all storage providers
 * @param entries Array of devlog entries to calculate statistics from
 * @returns DevlogStats object with counts and breakdowns
 */
export function calculateDevlogStats(entries: DevlogEntry[]): DevlogStats {
  const byStatus = {} as Record<DevlogStatus, number>;
  const byType = {} as Record<DevlogType, number>;
  const byPriority = {} as Record<DevlogPriority, number>;

  let openEntries = 0;
  let closedEntries = 0;

  entries.forEach((entry) => {
    byStatus[entry.status] = (byStatus[entry.status] || 0) + 1;
    byType[entry.type] = (byType[entry.type] || 0) + 1;
    byPriority[entry.priority] = (byPriority[entry.priority] || 0) + 1;

    // Categorize as open or closed based on GitHub model
    if (['done', 'cancelled'].includes(entry.status)) {
      closedEntries++;
    } else {
      openEntries++;
    }
  });

  return {
    totalEntries: entries.length,
    openEntries,
    closedEntries,
    byStatus,
    byType,
    byPriority,
  };
}
