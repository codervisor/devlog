/**
 * TypeORM entities for devlog storage
 * These entities map directly to the TypeScript interfaces in core.ts
 * Uses conditional column decorators for database-specific optimizations
 */

import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import type {
  DevlogType,
  DevlogStatus,
  DevlogPriority,
  DevlogNote,
  DevlogContext,
  AIContext,
  ExternalReference,
} from '../types/core.js';

// Get database type from DEVLOG_STORAGE_TYPE environment variable
const STORAGE_TYPE = process.env.DEVLOG_STORAGE_TYPE?.toLowerCase() || 'sqlite';

// Conditional column decorators based on storage type
const TypeColumn = STORAGE_TYPE === 'sqlite' 
  ? Column({ type: 'varchar', length: 50 })
  : Column({ 
      type: 'enum', 
      enum: ['feature', 'bugfix', 'task', 'refactor', 'docs'] 
    });

const StatusColumn = STORAGE_TYPE === 'sqlite'
  ? Column({ type: 'varchar', length: 50, default: 'new' })
  : Column({
      type: 'enum',
      enum: ['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'],
      default: 'new',
    });

const PriorityColumn = STORAGE_TYPE === 'sqlite'
  ? Column({ type: 'varchar', length: 50, default: 'medium' })
  : Column({
      type: 'enum',
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    });

// Date columns - timestamptz for postgres, datetime for mysql/sqlite  
const TimestampColumn = (options: any = {}) => {
  if (STORAGE_TYPE === 'postgres' || STORAGE_TYPE === 'postgresql') {
    return Column({ type: 'timestamptz', ...options });
  }
  return Column({ type: 'datetime', ...options });
};

// JSON columns - jsonb for postgres, json for mysql, text for sqlite
const JsonColumn = (options: any = {}) => {
  if (STORAGE_TYPE === 'postgres' || STORAGE_TYPE === 'postgresql') {
    return Column({ type: 'jsonb', ...options });
  } else if (STORAGE_TYPE === 'mysql') {
    return Column({ type: 'json', ...options });
  }
  return Column({ type: 'text', ...options });
};

/**
 * Main DevlogEntry entity matching the DevlogEntry interface
 */
@Entity('devlog_entries')
@Index(['status'])
@Index(['type'])
@Index(['priority'])
@Index(['assignee'])
@Index(['key'])
export class DevlogEntryEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, unique: true, name: 'key_field' })
  key!: string;

  @Column({ type: 'varchar', length: 500 })
  title!: string;

  @TypeColumn
  type!: DevlogType;

  @Column({ type: 'text' })
  description!: string;

  @StatusColumn
  status!: DevlogStatus;

  @PriorityColumn
  priority!: DevlogPriority;

  @CreateDateColumn({ type: STORAGE_TYPE === 'postgres' || STORAGE_TYPE === 'postgresql' ? 'timestamptz' : 'datetime', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: STORAGE_TYPE === 'postgres' || STORAGE_TYPE === 'postgresql' ? 'timestamptz' : 'datetime', name: 'updated_at' })
  updatedAt!: Date;

  @TimestampColumn({ nullable: true, name: 'closed_at' })
  closedAt?: Date;

  @Column({ type: 'boolean', default: false })
  archived!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  assignee?: string;

  @JsonColumn({ default: STORAGE_TYPE === 'sqlite' ? '[]' : [] })
  notes!: DevlogNote[];

  @JsonColumn({ default: STORAGE_TYPE === 'sqlite' ? '[]' : [] })
  files!: string[];

  @JsonColumn({ default: STORAGE_TYPE === 'sqlite' ? '[]' : [], name: 'related_devlogs' })
  relatedDevlogs!: string[];

  @JsonColumn({ nullable: true })
  context?: DevlogContext;

  @JsonColumn({ nullable: true, name: 'ai_context' })
  aiContext?: AIContext;

  @JsonColumn({ default: STORAGE_TYPE === 'sqlite' ? '[]' : [], name: 'external_references' })
  externalReferences!: ExternalReference[];
}
