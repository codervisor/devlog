/**
 * Shared WorkspaceDevlogManager instance for the web application
 * Ensures that API routes and SSE bridge use the same manager instance
 */

import { WorkspaceDevlogManager } from '@devlog/core';
import { join } from 'path';
import { homedir } from 'os';

let sharedWorkspaceManager: WorkspaceDevlogManager | null = null;

/**
 * Get the shared WorkspaceDevlogManager instance
 * Creates and initializes it if it doesn't exist
 */
export async function getSharedWorkspaceManager(): Promise<WorkspaceDevlogManager> {
  if (!sharedWorkspaceManager) {
    sharedWorkspaceManager = new WorkspaceDevlogManager({
      workspaceConfigPath: join(homedir(), '.devlog', 'workspaces.json'),
      createWorkspaceConfigIfMissing: true,
      fallbackToEnvConfig: true,
    });
    await sharedWorkspaceManager.initialize();
    console.log('Shared WorkspaceDevlogManager initialized');
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
