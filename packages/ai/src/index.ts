/**
 * @devlog/ai - GitHub Copilot Chat History Extractor
 *
 * Main entry point for the TypeScript implementation
 */

// Export all models
export * from './models/index.js';

// Export all parsers
export * from './parsers/index.js';

// Export all exporters
export * from './exporters/index.js';

// Export automation layer
export * from './automation/index.js';

// Re-export main classes for convenience
export {
  MessageData as Message,
  ChatSessionData as ChatSession,
  WorkspaceDataContainer as WorkspaceData,
} from './models/index.js';
