/**
 * Abstract storage interface that supports different storage backends
 */

import { StorageConfig, StorageProvider } from '../types/index.js';
import { JsonStorageProvider, TypeORMStorageProvider } from './providers/index.js';
import { TypeORMStorageOptions } from './typeorm/typeorm-config.js';

/**
 * Factory for creating storage providers based on configuration
 * Implements singleton pattern to prevent race conditions and duplicate connections
 */
export class StorageProviderFactory {
  private static instanceCache = new Map<string, Promise<StorageProvider>>();

  static async create(config?: StorageConfig): Promise<StorageProvider> {
    // Generate cache key based on configuration
    const cacheKey = StorageProviderFactory.generateCacheKey(config);

    // Return existing instance if available
    if (StorageProviderFactory.instanceCache.has(cacheKey)) {
      console.log(`📦 StorageProviderFactory: Returning cached ${config?.type} provider`);
      return StorageProviderFactory.instanceCache.get(cacheKey)!;
    }

    console.log(`🚀 StorageProviderFactory: Creating new ${config?.type} provider`);

    // Create initialization promise to prevent race conditions
    const initPromise = StorageProviderFactory.createProvider(config);

    // Cache the promise immediately to prevent concurrent creation
    StorageProviderFactory.instanceCache.set(cacheKey, initPromise);

    try {
      const provider = await initPromise;
      console.log(`✅ StorageProviderFactory: ${config?.type} provider created and initialized`);
      return provider;
    } catch (error) {
      // Remove failed initialization from cache so it can be retried
      StorageProviderFactory.instanceCache.delete(cacheKey);
      console.error(`❌ StorageProviderFactory: Failed to create ${config?.type} provider:`, error);
      throw error;
    }
  }

  private static async createProvider(config?: StorageConfig): Promise<StorageProvider> {
    // Handle storage types (GitHub is now an integration, not storage)
    switch (config?.type) {
      case 'sqlite':
        // Use TypeORM for SQLite
        const sqliteOptions: TypeORMStorageOptions = {
          type: 'sqlite',
          database_path: config.connectionString || '.devlog/devlog.sqlite',
          synchronize: true,
          logging: process.env.NODE_ENV === 'development',
        };
        const sqliteProvider = new TypeORMStorageProvider(sqliteOptions);
        await sqliteProvider.initialize();
        return sqliteProvider;

      case 'postgres':
        // Use TypeORM for PostgreSQL
        const postgresOptions: TypeORMStorageOptions = {
          type: 'postgres',
          url: config.connectionString,
          synchronize: process.env.NODE_ENV === 'development',
          logging: process.env.NODE_ENV === 'development',
          ssl: process.env.NODE_ENV === 'production',
          ...config.options,
        };
        const postgresProvider = new TypeORMStorageProvider(postgresOptions);
        await postgresProvider.initialize();
        return postgresProvider;

      case 'mysql':
        // Use TypeORM for MySQL
        let mysqlOptions: TypeORMStorageOptions;

        if (config.connectionString) {
          // Parse MySQL connection string
          const url = new URL(config.connectionString);
          mysqlOptions = {
            type: 'mysql',
            host: url.hostname,
            port: parseInt(url.port) || 3306,
            username: url.username,
            password: url.password,
            database: url.pathname.slice(1), // Remove leading slash
            synchronize: process.env.NODE_ENV === 'development',
            logging: process.env.NODE_ENV === 'development',
          };
        } else {
          // Use options object
          mysqlOptions = {
            type: 'mysql',
            host: config.options?.host || 'localhost',
            port: config.options?.port || 3306,
            username: config.options?.username,
            password: config.options?.password,
            database: config.options?.database,
            synchronize: process.env.NODE_ENV === 'development',
            logging: process.env.NODE_ENV === 'development',
          };
        }
        const mysqlProvider = new TypeORMStorageProvider(mysqlOptions);
        await mysqlProvider.initialize();
        return mysqlProvider;

      case 'json':
      default:
        return new JsonStorageProvider(config?.json || {});
    }
  }

  /**
   * Generate cache key based on storage configuration
   */
  private static generateCacheKey(config?: StorageConfig): string {
    if (!config) {
      return 'json:default';
    }

    switch (config.type) {
      case 'sqlite':
        return `sqlite:${config.connectionString || '.devlog/devlog.sqlite'}`;

      case 'postgres':
        return `postgres:${config.connectionString || 'default'}`;

      case 'mysql':
        if (config.connectionString) {
          return `mysql:${config.connectionString}`;
        }
        const host = config.options?.host || 'localhost';
        const port = config.options?.port || 3306;
        const database = config.options?.database || 'default';
        return `mysql:${host}:${port}:${database}`;

      case 'json':
      default:
        return 'json:default';
    }
  }

  /**
   * Clear the instance cache (useful for testing or configuration changes)
   */
  static clearCache(): void {
    console.log('🧹 StorageProviderFactory: Clearing instance cache');
    StorageProviderFactory.instanceCache.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: StorageProviderFactory.instanceCache.size,
      keys: Array.from(StorageProviderFactory.instanceCache.keys()),
    };
  }
}
