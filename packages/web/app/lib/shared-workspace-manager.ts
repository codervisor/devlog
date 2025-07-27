/**
 * Shared WorkspaceDevlogManager instance for the web application
 * Ensures that API routes and SSE bridge use the same manager instance
 */

import { WorkspaceDevlogManager } from '@codervisor/devlog-core';
import { join } from 'path';
import { homedir } from 'os';

let sharedWorkspaceManager: WorkspaceDevlogManager | null = null;

/**
 * Get the shared WorkspaceDevlogManager instance
 * Creates and initializes it if it doesn't exist
 */
export async function getSharedWorkspaceManager(): Promise<WorkspaceDevlogManager> {
  if (!sharedWorkspaceManager) {
    console.log('[Shared Workspace Manager] Creating new WorkspaceDevlogManager instance...');
    const startTime = Date.now();

    sharedWorkspaceManager = new WorkspaceDevlogManager({
      workspaceConfigPath: join(homedir(), '.devlog', 'workspaces.json'),
      createWorkspaceConfigIfMissing: true,
      fallbackToEnvConfig: true,
    });

    console.log('[Shared Workspace Manager] Initializing manager...');
    const initStartTime = Date.now();
    await sharedWorkspaceManager.initialize();
    const initDuration = Date.now() - initStartTime;

    const totalDuration = Date.now() - startTime;
    console.log(
      `[Shared Workspace Manager] Initialized successfully (init: ${initDuration}ms, total: ${totalDuration}ms)`,
    );
  } else {
    console.log('[Shared Workspace Manager] Reusing existing WorkspaceDevlogManager instance');
  }
  return sharedWorkspaceManager;
}

/**
 * Cleanup the shared manager on app shutdown
 */
export async function cleanupSharedWorkspaceManager(): Promise<void> {
  if (sharedWorkspaceManager) {
    await sharedWorkspaceManager.cleanup();
    sharedWorkspaceManager = null;
    console.log('Shared WorkspaceDevlogManager cleaned up');
  }
}
