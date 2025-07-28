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
import type { DevlogPriority, DevlogStatus, DevlogType } from '../types/index.js';
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
@Index(['projectId'])
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

  @Column({ type: 'int', nullable: true, name: 'project_id' })
  projectId?: number;

  // Flattened DevlogContext fields (simple strings and arrays)
  @Column({ type: 'text', nullable: true, name: 'business_context' })
  businessContext?: string;

  @Column({ type: 'text', nullable: true, name: 'technical_context' })
  technicalContext?: string;

  @JsonColumn({ default: getStorageType() === 'sqlite' ? '[]' : [], name: 'acceptance_criteria' })
  acceptanceCriteria!: string[];
}
