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
    console.log('[WorkspaceManager] Creating new AutoWorkspaceManager...');
    console.log('[WorkspaceManager] Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      POSTGRES_URL: !!process.env.POSTGRES_URL,
      DEVLOG_STORAGE_TYPE: process.env.DEVLOG_STORAGE_TYPE,
    });

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

    console.log('[WorkspaceManager] Initializing manager...');
    try {
      await globalWorkspaceManager.initialize();
      console.log('[WorkspaceManager] Manager initialized successfully');
    } catch (error) {
      console.error('[WorkspaceManager] Failed to initialize:', error);
      throw error;
    }
  }

  return globalWorkspaceManager;
}

/**
 * Get storage information for debugging and monitoring
 */
export async function getStorageInfo() {
  try {
    const manager = await getWorkspaceManager();
    
    // Check if getStorageInfo method exists
    if (typeof manager.getStorageInfo === 'function') {
      return manager.getStorageInfo();
    } else {
      // Return basic info if method doesn't exist
      return {
        type: 'auto-detected',
        status: 'initialized',
      };
    }
  } catch (error) {
    console.error('[WorkspaceManager] Error getting storage info:', error);
    return {
      type: 'unknown',
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
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
