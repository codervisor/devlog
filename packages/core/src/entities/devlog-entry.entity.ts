/**
 * TypeORM entities for devlog storage
 * These entities map directly to the TypeScript interfaces in core.ts
 * Uses shared conditional column decorators for database-specific optimizations
 */

import 'reflect-metadata';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  AIContext,
  DevlogContext,
  DevlogNote,
  DevlogPriority,
  DevlogStatus,
  DevlogType,
  ExternalReference,
} from '../types/index.js';
import {
  JsonColumn,
  TimestampColumn,
  TypeColumn,
  StatusColumn,
  PriorityColumn,
  getTimestampType,
  getStorageType,
} from './decorators.js';

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

  @CreateDateColumn({
    type: getTimestampType(),
    name: 'created_at',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: getTimestampType(),
    name: 'updated_at',
  })
  updatedAt!: Date;

  @TimestampColumn({ nullable: true, name: 'closed_at' })
  closedAt?: Date;

  @Column({ type: 'boolean', default: false })
  archived!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  assignee?: string;

  @JsonColumn({ default: getStorageType() === 'sqlite' ? '[]' : [] })
  notes!: DevlogNote[];

  @JsonColumn({ default: getStorageType() === 'sqlite' ? '[]' : [] })
  files!: string[];

  @JsonColumn({ default: getStorageType() === 'sqlite' ? '[]' : [], name: 'related_devlogs' })
  relatedDevlogs!: string[];

  @JsonColumn({ nullable: true })
  context?: DevlogContext;

  @JsonColumn({ nullable: true, name: 'ai_context' })
  aiContext?: AIContext;

  @JsonColumn({ default: getStorageType() === 'sqlite' ? '[]' : [], name: 'external_references' })
  externalReferences!: ExternalReference[];
}
