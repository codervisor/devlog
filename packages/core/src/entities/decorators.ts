/**
 * Shared TypeORM column decorators that adapt to different database types
 * This eliminates code duplication between entity files
 */

import 'reflect-metadata';
import { Column } from 'typeorm';
import type { StorageType } from '../types/index.js';
import { loadRootEnv } from '../utils/env-loader.js';

loadRootEnv();

export function getStorageType(): StorageType {
  const storageType = process.env.DEVLOG_STORAGE_TYPE?.toLowerCase() || 'postgres';
  if (['postgres', 'postgre', 'mysql', 'sqlite'].includes(storageType)) {
    return storageType as StorageType;
  }
  return 'postgres';
}

/**
 * JSON columns - jsonb for postgres, json for mysql, text for sqlite
 */
export const JsonColumn = (options: any = {}) => {
  if (getStorageType() === 'postgres') {
    return Column({ type: 'jsonb', ...options });
  } else if (getStorageType() === 'mysql') {
    return Column({ type: 'json', ...options });
  }
  return Column({ type: 'text', ...options });
};

/**
 * Date columns - timestamptz for postgres, datetime for mysql/sqlite
 */
export const TimestampColumn = (options: any = {}) => {
  if (getStorageType() === 'postgres') {
    return Column({ type: 'timestamptz', ...options });
  }
  return Column({ type: 'datetime', ...options });
};

/**
 * Enum columns - varchar for sqlite, enum for postgres/mysql
 */
export const TypeColumn = Column({
  type: getStorageType() === 'sqlite' ? 'varchar' : 'enum',
  ...(getStorageType() === 'sqlite' 
    ? { length: 50 } 
    : { enum: ['feature', 'bugfix', 'task', 'refactor', 'docs'] }
  ),
});

export const StatusColumn = Column({
  type: getStorageType() === 'sqlite' ? 'varchar' : 'enum',
  ...(getStorageType() === 'sqlite' 
    ? { length: 50, default: 'new' } 
    : { 
        enum: ['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'],
        default: 'new' 
      }
  ),
});

export const PriorityColumn = Column({
  type: getStorageType() === 'sqlite' ? 'varchar' : 'enum',
  ...(getStorageType() === 'sqlite' 
    ? { length: 50, default: 'medium' } 
    : { 
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium' 
      }
  ),
});

/**
 * Helper function to get the appropriate timestamp type for CreateDateColumn and UpdateDateColumn
 */
export const getTimestampType = () => {
  return getStorageType() === 'postgres' ? 'timestamptz' : 'datetime';
};
