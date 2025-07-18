import { DevlogManager } from '@devlog/core';
import { sseEventBridge } from './sse-event-bridge';

let devlogManager: DevlogManager | null = null;

export async function getDevlogManager(): Promise<DevlogManager> {
  if (!devlogManager) {
    const { DevlogManager } = await import('@devlog/core');
    devlogManager = new DevlogManager();
    await devlogManager.initialize();
    
    // Initialize SSE bridge to ensure real-time updates work
    // This ensures events from MCP server are captured and broadcast to web clients
    sseEventBridge.initialize();
  }
  return devlogManager;
}
