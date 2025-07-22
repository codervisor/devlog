// Managers
export * from './managers';

// Event System
export {
  DevlogEventEmitter,
  devlogEvents,
  type DevlogEvent,
  type DevlogEventHandler,
} from './events/devlog-events';

// Services
export * from './services';

// Storage Providers
export { StorageProviderFactory } from './storage/storage-provider';
export { JsonStorageProvider } from './storage/providers/json-storage';
export { GitHubStorageProvider } from './storage/providers/github-storage';
export { TypeORMStorageProvider } from './storage/providers/typeorm-storage';
export { EnterpriseSync } from './integrations/enterprise-sync';

// TypeORM Support
export {
  createDataSource,
  parseTypeORMConfig,
  type TypeORMStorageOptions,
} from './storage/typeorm/typeorm-config';
export { DevlogEntryEntity } from './entities/devlog-entry.entity';
export { WorkspaceEntity } from './entities/workspace.entity';

// Re-export types for convenience
export * from './types';

// Utilities
export * from './utils';

// Re-export emoji utilities for public API
export {
  getStatusEmoji,
  getStatusEmojiByStyle,
  getPriorityEmoji,
  getTypeEmoji,
  getNoteCategoryEmoji,
  getStatusDisplayWithEmoji,
  getPriorityDisplayWithEmoji,
  getTypeDisplayWithEmoji,
  getNoteCategoryDisplayWithEmoji,
  formatEnhancedGitHubTitle,
  formatGitHubComment,
  type EmojiStyle,
} from './storage/github/emoji-mappings';

// Environment Configuration
export { loadRootEnv, getMonorepoRoot, initializeEnv } from './utils/env-loader';
