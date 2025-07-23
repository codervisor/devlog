import { sseEventBridge } from './sse-event-bridge';

// Types only - these won't be bundled at runtime
import type { WorkspaceDevlogManager } from '@devlog/core';

// Use globalThis to persist the manager across hot reloads in development
declare global {
  var __workspaceDevlogManager: WorkspaceDevlogManager | undefined;
}

let workspaceDevlogManager: WorkspaceDevlogManager | null = null;

export async function getWorkspaceDevlogManager(): Promise<WorkspaceDevlogManager> {
  // In development, check for existing manager in global scope to survive hot reloads
  if (process.env.NODE_ENV === 'development' && globalThis.__workspaceDevlogManager) {
    workspaceDevlogManager = globalThis.__workspaceDevlogManager;
    return workspaceDevlogManager;
  }

  if (!workspaceDevlogManager) {
    // Dynamically import to avoid bundling TypeORM in client-side code
    const { WorkspaceDevlogManager, loadRootEnv } = await import('@devlog/core');
    
    // Ensure environment variables are loaded from root before initializing
    loadRootEnv();
    
    workspaceDevlogManager = new WorkspaceDevlogManager({
      fallbackToEnvConfig: true,
      createWorkspaceConfigIfMissing: true,
    });
    await workspaceDevlogManager.initialize();
    
    // Store in global scope for development hot reload persistence
    if (process.env.NODE_ENV === 'development') {
      globalThis.__workspaceDevlogManager = workspaceDevlogManager;
    }
    
    // Initialize SSE bridge to ensure real-time updates work
    // This ensures events from MCP server are captured and broadcast to web clients
    sseEventBridge.initialize();
  }
  return workspaceDevlogManager;
}

// Legacy alias for backward compatibility - remove in next major version
export const getDevlogManager = getWorkspaceDevlogManager;
