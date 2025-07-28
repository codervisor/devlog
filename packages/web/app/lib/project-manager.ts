/**
 * Simplified Project Manager for Web API Routes
 *
 * Uses database storage directly with centralized configuration.
 * No longer auto-detects between file and database storage since
 * JSON/file storage is deprecated.
 */

import {
  DatabaseProjectManager,
  AppConfigManager,
  parseTypeORMConfig,
  createDataSource,
  ProjectEntity,
} from '@codervisor/devlog-core';
import { join } from 'path';
import { homedir } from 'os';

let globalProjectManager: DatabaseProjectManager | null = null;
let globalAppConfigManager: AppConfigManager | null = null;
let projectManagerInitPromise: Promise<DatabaseProjectManager> | null = null;

/**
 * Get or create the singleton application config manager
 */
export async function getAppConfigManager(): Promise<AppConfigManager> {
  if (!globalAppConfigManager) {
    console.log('[AppConfigManager] Creating new AppConfigManager...');

    globalAppConfigManager = new AppConfigManager({
      configPath: join(homedir(), '.devlog', 'app-config.json'),
      createIfMissing: true,
    });

    console.log('[AppConfigManager] App config manager created');
  }

  return globalAppConfigManager;
}

/**
 * Get or create the singleton project manager instance
 * Uses database storage directly with centralized configuration
 */
export async function getProjectManager(): Promise<DatabaseProjectManager> {
  // If already initialized, return the existing instance
  if (globalProjectManager) {
    return globalProjectManager;
  }

  // If initialization is in progress, wait for it to complete
  if (projectManagerInitPromise) {
    console.log('[ProjectManager] Waiting for existing initialization to complete...');
    return await projectManagerInitPromise;
  }

  // Start initialization process
  console.log('[ProjectManager] Starting new DatabaseProjectManager initialization...');
  projectManagerInitPromise = initializeProjectManager();

  try {
    globalProjectManager = await projectManagerInitPromise;
    return globalProjectManager;
  } catch (error) {
    // Reset the promise on failure so we can retry
    projectManagerInitPromise = null;
    throw error;
  }
}

/**
 * Internal function to actually initialize the project manager
 */
async function initializeProjectManager(): Promise<DatabaseProjectManager> {
  console.log('[ProjectManager] Creating new DatabaseProjectManager...');
  console.log('[ProjectManager] Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    POSTGRES_URL: !!process.env.POSTGRES_URL ? 'configured' : 'not set',
    DEVLOG_STORAGE_TYPE: process.env.DEVLOG_STORAGE_TYPE,
  });

  // Create database connection
  const typeormConfig = parseTypeORMConfig();
  const dataSource = createDataSource(typeormConfig, [ProjectEntity]);

  const manager = new DatabaseProjectManager({
    database: dataSource,
    createDefaultIfMissing: true,
    maxProjects: 100,
    defaultProjectConfig: {
      name: 'Default Project',
      description: 'Default devlog project',
      settings: {
        defaultPriority: 'medium',
      },
    },
  });

  console.log('[ProjectManager] Initializing project manager...');
  try {
    await manager.initialize();
    console.log('[ProjectManager] Project manager initialized successfully');
    return manager;
  } catch (error) {
    console.error('[ProjectManager] Failed to initialize:', error);
    throw error;
  }
}

/**
 * Get centralized storage configuration
 */
export async function getAppStorageConfig() {
  try {
    const appConfigManager = await getAppConfigManager();
    return appConfigManager.getStorageConfig();
  } catch (error) {
    console.error('[AppConfigManager] Error getting storage config:', error);
    return {
      type: 'json',
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get project storage information for debugging and monitoring
 */
export async function getProjectStorageInfo() {
  try {
    const projectManager = await getProjectManager();
    return {
      type: 'database',
      manager: 'DatabaseProjectManager',
      status: 'active',
    };
  } catch (error) {
    console.error('[ProjectManager] Error getting project storage info:', error);
    return {
      type: 'unknown',
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Reset the global managers (useful for testing)
 */
export async function resetManagers(): Promise<void> {
  if (globalProjectManager) {
    await globalProjectManager.dispose();
    globalProjectManager = null;
  }
  globalAppConfigManager = null;
}
