/**
 * Abstract storage interface that supports different storage backends
 */

import { DevlogEntry, DevlogFilter, DevlogId, DevlogStats, StorageConfig, StorageProvider } from '../types/index.js';

/**
 * Factory for creating storage providers based on configuration
 */
export class StorageProviderFactory {
  static async create(config?: StorageConfig): Promise<StorageProvider> {
    // Handle new storage strategies
    switch (config?.type) {
      case 'github':
        if (!config?.github) {
          throw new Error('GitHub configuration is required for github storage type');
        }
        const { GitHubStorageProvider } = await import('./github-storage.js');
        return new GitHubStorageProvider(config.github);

      case 'sqlite':
        const { SQLiteStorageProvider } = await import('./sqlite-storage.js');
        return new SQLiteStorageProvider(config.connectionString || ':memory:', config.options);

      case 'postgres':
        const { PostgreSQLStorageProvider } = await import('./postgresql-storage.js');
        return new PostgreSQLStorageProvider(config.connectionString!, config.options);

      case 'mysql':
        const { MySQLStorageProvider } = await import('./mysql-storage.js');
        return new MySQLStorageProvider(config.connectionString!, config.options);

      case 'json':
      default:
        const { JsonStorageProvider } = await import('./json-storage.js');
        return new JsonStorageProvider(config?.json || {});
    }
  }
}
