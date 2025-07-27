/**
 * Abstract storage interface that supports different storage backends
 */

import { StorageConfig, StorageProvider } from '../types/index.js';
import { JsonStorageProvider, TypeORMStorageProvider } from './providers/index.js';
import { TypeORMStorageOptions } from './typeorm/typeorm-config.js';

/**
 * Factory for creating storage providers based on configuration
 */
export class StorageProviderFactory {
  static async create(config?: StorageConfig): Promise<StorageProvider> {
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
}
