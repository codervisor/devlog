export { DevlogManager } from './devlog-manager.js';
export { ConfigurationManager } from './configuration-manager.js';

// Event System
export {
  DevlogEventEmitter,
  devlogEvents,
  type DevlogEvent,
  type DevlogEventHandler,
} from './events/devlog-events.js';

// Integration Service
export { IntegrationService } from './integration-service.js';

// Chat Import Service
export {
  DefaultChatImportService,
  type ChatImportService,
} from './services/chat-import-service.js';

// Storage Providers
export { StorageProviderFactory } from './storage/storage-provider.js';
export { JsonStorageProvider } from './storage/json-storage.js';
export { GitHubStorageProvider } from './storage/github-storage.js';
export { TypeORMStorageProvider } from './storage/typeorm-storage.js';
export { EnterpriseSync } from './integrations/enterprise-sync.js';

// TypeORM Support
export {
  createDataSource,
  parseTypeORMConfig,
  type TypeORMStorageOptions,
} from './storage/typeorm-config.js';
export { DevlogEntryEntity } from './entities/devlog-entry.entity.js';

// Re-export types for convenience
export * from './types/index.js';

// Utilities
export * from './utils/index.js';

// Environment Configuration
export { loadRootEnv, getMonorepoRoot, initializeEnv } from './utils/env-loader.js';
