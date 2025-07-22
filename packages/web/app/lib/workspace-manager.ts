/**
 * Enhanced workspace manager utility for web API routes
 * Automatically selects appropriate storage backend for deployment environment
 */

import { AutoWorkspaceManager } from '@devlog/core';
import { join } from 'path';
import { homedir } from 'os';

let globalWorkspaceManager: AutoWorkspaceManager | null = null;

/**
 * Get or create the singleton workspace manager instance
 * Uses auto-detection to choose between file and database storage
 */
export async function getWorkspaceManager(): Promise<AutoWorkspaceManager> {
  if (!globalWorkspaceManager) {
    globalWorkspaceManager = new AutoWorkspaceManager({
      storageType: 'auto', // Let it auto-detect based on environment
      fileOptions: {
        configPath: join(homedir(), '.devlog', 'workspaces.json'),
        createIfMissing: true,
      },
      databaseOptions: {
        createDefaultIfMissing: true,
        maxWorkspaces: 100, // Higher limit for cloud deployments
      },
      defaultWorkspaceConfig: {
        workspace: {
          name: 'Default Workspace',
          description: 'Default devlog workspace',
          settings: {
            defaultPriority: 'medium',
          },
        },
        storage: {
          type: 'json',
          json: {
            directory: '.devlog',
            global: false,
          },
        },
      },
    });

    await globalWorkspaceManager.initialize();
  }

  return globalWorkspaceManager;
}

/**
 * Get storage information for debugging and monitoring
 */
export async function getStorageInfo() {
  const manager = await getWorkspaceManager();
  return manager.getStorageInfo();
}

/**
 * Reset the global manager (useful for testing)
 */
export async function resetWorkspaceManager(): Promise<void> {
  if (globalWorkspaceManager) {
    await globalWorkspaceManager.dispose();
    globalWorkspaceManager = null;
  }
}
