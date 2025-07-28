/**
 * TypeORM data source configuration for multiple database types
 */

import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import {
  ChatDevlogLinkEntity,
  ChatMessageEntity,
  ChatSessionEntity,
  DevlogDependencyEntity,
  DevlogEntryEntity,
  DevlogNoteEntity,
  ProjectEntity,
} from '../entities/index.js';

/**
 * Configuration options for TypeORM storage
 */
export interface TypeORMStorageOptions {
  type: 'postgres' | 'mysql' | 'sqlite';
  // Connection options
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  url?: string; // For PostgreSQL URL-based connection
  // SQLite specific
  database_path?: string;
  // General options
  synchronize?: boolean;
  logging?: boolean;
  ssl?: boolean;
}

/**
 * Create TypeORM DataSource based on storage options
 * Uses caching to prevent duplicate connections in development
 */
export function createDataSource({
  options,
  entities,
}: {
  options?: TypeORMStorageOptions;
  entities?: Function[];
}): DataSource {
  if (!options) {
    options = parseTypeORMConfig(); // Fallback to environment-based configuration
  }

  const baseConfig: Partial<DataSourceOptions> = {
    entities: entities || [
      ProjectEntity,
      DevlogEntryEntity,
      DevlogNoteEntity,
      DevlogDependencyEntity,
      ChatSessionEntity,
      ChatMessageEntity,
      ChatDevlogLinkEntity,
    ],
    synchronize: options.synchronize ?? false, // Default to false for production safety
    logging: options.logging ?? false,
  };

  let config: DataSourceOptions;

  switch (options.type) {
    case 'postgres':
      if (options.url) {
        config = {
          ...baseConfig,
          type: 'postgres',
          url: options.url,
          ssl: options.ssl ?? false,
        } as DataSourceOptions;
      } else {
        config = {
          ...baseConfig,
          type: 'postgres',
          host: options.host ?? 'localhost',
          port: options.port ?? 5432,
          username: options.username,
          password: options.password,
          database: options.database,
          ssl: options.ssl ?? false,
        } as DataSourceOptions;
      }
      break;

    case 'mysql':
      config = {
        ...baseConfig,
        type: 'mysql',
        host: options.host ?? 'localhost',
        port: options.port ?? 3306,
        username: options.username,
        password: options.password,
        database: options.database,
      } as DataSourceOptions;
      break;

    case 'sqlite':
      config = {
        ...baseConfig,
        type: 'better-sqlite3',
        database: options.database_path ?? ':memory:',
      } as DataSourceOptions;
      break;

    default:
      throw new Error(`Unsupported database type: ${options.type}`);
  }

  return new DataSource(config);
}

/**
 * Parse database configuration from environment variables
 */
export function parseTypeORMConfig(): TypeORMStorageOptions {
  const postgresUrl = process.env.POSTGRES_URL;
  const mysqlUrl = process.env.MYSQL_URL;
  const dbType = process.env.DEVLOG_STORAGE_TYPE?.toLowerCase();

  // Respect explicit storage type configuration first
  if (dbType === 'postgres' && postgresUrl) {
    return {
      type: 'postgres',
      url: postgresUrl,
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
      ssl: process.env.NODE_ENV === 'production',
    };
  }

  if (dbType === 'mysql') {
    if (mysqlUrl) {
      return {
        type: 'mysql',
        url: mysqlUrl,
        synchronize: process.env.NODE_ENV === 'development',
        logging: process.env.NODE_ENV === 'development',
      };
    } else {
      return {
        type: 'mysql',
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
        username: process.env.MYSQL_USERNAME,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        synchronize: process.env.NODE_ENV === 'development',
        logging: process.env.NODE_ENV === 'development',
      };
    }
  }

  if (dbType === 'sqlite') {
    return {
      type: 'sqlite',
      database_path: process.env.SQLITE_PATH ?? '.devlog/devlog.sqlite',
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
    };
  }

  // Fallback to URL-based auto-detection only if no explicit type is set
  if (!dbType) {
    if (postgresUrl) {
      return {
        type: 'postgres',
        url: postgresUrl,
        synchronize: process.env.NODE_ENV === 'development',
        logging: process.env.NODE_ENV === 'development',
        ssl: process.env.NODE_ENV === 'production',
      };
    }

    if (mysqlUrl) {
      return {
        type: 'mysql',
        url: mysqlUrl,
        synchronize: process.env.NODE_ENV === 'development',
        logging: process.env.NODE_ENV === 'development',
      };
    }
  }

  // Default to SQLite if no configuration is found
  return {
    type: 'sqlite',
    database_path: '.devlog/devlog.sqlite',
    synchronize: true,
    logging: process.env.NODE_ENV === 'development',
  };
}
