/**
 * Centralized environment variable loader for the monorepo
 * Ensures all packages load .env from the root directory
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Find the monorepo root directory by looking for package.json with workspaces or pnpm-workspace.yaml
 */
function findMonorepoRoot(startDir: string): string {
  let currentDir = startDir;
  
  while (currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    const pnpmWorkspacePath = path.join(currentDir, 'pnpm-workspace.yaml');
    
    // Check for pnpm-workspace.yaml first (pnpm monorepo)
    try {
      fs.readFileSync(pnpmWorkspacePath, 'utf8');
      return currentDir;
    } catch {
      // pnpm-workspace.yaml doesn't exist, continue checking
    }
    
    // Check for package.json with workspaces (npm/yarn monorepo)
    try {
      const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageJsonContent);
      
      // Check if this package.json has workspaces (indicates root of monorepo)
      if (packageJson.workspaces) {
        return currentDir;
      }
    } catch {
      // package.json doesn't exist or can't be read, continue searching
    }
    
    currentDir = path.dirname(currentDir);
  }
  
  // Fallback: if no workspace package.json found, return the starting directory
  return startDir;
}

/**
 * Get the current directory for the calling module
 */
function getCurrentDir(): string {
  // For better monorepo detection, start from process.cwd() 
  // since that's where the script is being executed from
  return process.cwd();
}

let isLoaded = false;
let rootDir: string | null = null;

/**
 * Load environment variables from the monorepo root .env file
 * This function is safe to call multiple times - it will only load once
 */
export function loadRootEnv(): void {
  if (isLoaded) {
    return;
  }
  
  try {
    // Find the monorepo root
    const currentDir = getCurrentDir();
    rootDir = findMonorepoRoot(currentDir);
    
    // Try different .env file names in order of preference
    const envFiles = [
      '.env.local',     // Local development (highest priority)
      '.env',           // Standard .env file
    ];
    
    let loaded = false;
    for (const envFile of envFiles) {
      const envPath = path.join(rootDir, envFile);
      const result = dotenv.config({ path: envPath });
      
      if (!result.error) {
        loaded = true;
        break;
      }
    }
    
    isLoaded = true;
  } catch (error) {
    console.error(`⚠️  Failed to load environment variables:`, error);
    isLoaded = true; // Mark as loaded to prevent retry loops
  }
}

/**
 * Get the monorepo root directory
 */
export function getMonorepoRoot(): string {
  if (!rootDir) {
    loadRootEnv(); // This will set rootDir
  }
  return rootDir || process.cwd();
}

/**
 * Load environment variables and return the root directory
 * Convenient for packages that need both
 */
export function initializeEnv(): string {
  loadRootEnv();
  return getMonorepoRoot();
}
