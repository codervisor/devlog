/**
 * TypeORM entities for devlog storage
 * These entities map directly to the TypeScript interfaces in core.ts
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

  @Column({
    type: 'enum',
    enum: ['feature', 'bugfix', 'task', 'refactor', 'docs'],
  })
  type!: DevlogType;

  @Column({ type: 'text' })
  description!: string;

  @Column({
    type: 'enum',
    enum: ['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'],
    default: 'new',
  })
  status!: DevlogStatus;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  priority!: DevlogPriority;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'closed_at' })
  closedAt?: Date;

  @Column({ type: 'boolean', default: false })
  archived!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  assignee?: string;

  @Column({ type: 'jsonb', default: [] })
  notes!: DevlogNote[];

  @Column({ type: 'jsonb', default: [] })
  files!: string[];

  @Column({ type: 'jsonb', default: [], name: 'related_devlogs' })
  relatedDevlogs!: string[];

  @Column({ type: 'jsonb', nullable: true })
  context?: DevlogContext;

  @Column({ type: 'jsonb', nullable: true, name: 'ai_context' })
  aiContext?: AIContext;

  @Column({ type: 'jsonb', default: [], name: 'external_references' })
  externalReferences!: ExternalReference[];
}
