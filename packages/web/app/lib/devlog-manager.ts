import { sseEventBridge } from './sse-event-bridge';

// Types only - these won't be bundled at runtime
import type { DevlogManager } from '@devlog/core';

// Use globalThis to persist the manager across hot reloads in development
declare global {
  var __devlogManager: DevlogManager | undefined;
}

let devlogManager: DevlogManager | null = null;

export async function getDevlogManager(): Promise<DevlogManager> {
  // In development, check for existing manager in global scope to survive hot reloads
  if (process.env.NODE_ENV === 'development' && globalThis.__devlogManager) {
    devlogManager = globalThis.__devlogManager;
    return devlogManager;
  }

  if (!devlogManager) {
    // Dynamically import to avoid bundling TypeORM in client-side code
    const { DevlogManager, loadRootEnv } = await import('@devlog/core');
    
    // Ensure environment variables are loaded from root before initializing
    loadRootEnv();
    
    devlogManager = new DevlogManager();
    await devlogManager.initialize();
    
    // Store in global scope for development hot reload persistence
    if (process.env.NODE_ENV === 'development') {
      globalThis.__devlogManager = devlogManager;
    }
    
    // Initialize SSE bridge to ensure real-time updates work
    // This ensures events from MCP server are captured and broadcast to web clients
    sseEventBridge.initialize();
  }
  return devlogManager;
}
