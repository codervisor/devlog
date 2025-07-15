import path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { JsonConfig } from '../types/index.js';
import { parseBoolean } from './common.js';

export function getDevlogDirFromJsonConfig(config: JsonConfig): string {
  const devlogDir = config.directory || '.devlog';
  if (config.global) {
    // Use global directory (e.g., ~/.devlog)
    return path.join(os.homedir(), devlogDir);
  } else {
    // Use local directory (e.g., ./devlog)
    return path.join(getWorkspaceRoot(), devlogDir);
  }
}

export function getWorkspaceRoot(startPath: string = process.cwd()): string {
  if (process.env.NODE_ENV === 'production') {
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

    // Check for devlog-specific config
    if (fs.existsSync(path.join(currentDir, 'devlog.config.json'))) {
      return currentDir;
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
