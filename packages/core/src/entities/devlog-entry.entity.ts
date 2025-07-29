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
  closedAt?: Date | null;

  @Column({ type: 'boolean', default: false })
  archived!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  assignee?: string | null;

  @Column({ type: 'int', name: 'project_id' })
  projectId!: number;

  // Flattened DevlogContext fields (simple strings and arrays)
  @Column({ type: 'text', nullable: true, name: 'business_context' })
  businessContext?: string | null;

  @Column({ type: 'text', nullable: true, name: 'technical_context' })
  technicalContext?: string | null;

  @JsonColumn({ default: getStorageType() === 'sqlite' ? '[]' : [], name: 'acceptance_criteria' })
  acceptanceCriteria!: string[];

  /**
   * Convert entity to DevlogEntry interface
   */
  toDevlogEntry(): import('../types/index.js').DevlogEntry {
    return {
      id: this.id,
      key: this.key,
      title: this.title,
      type: this.type,
      description: this.description,
      status: this.status,
      priority: this.priority,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      closedAt: this.closedAt?.toISOString(),
      archived: this.archived,
      assignee: this.assignee,
      projectId: this.projectId,
      acceptanceCriteria: this.parseJsonField(this.acceptanceCriteria, []),
      businessContext: this.businessContext,
      technicalContext: this.technicalContext,
      // Related entities will be loaded separately when needed
      notes: [],
      dependencies: [],
    };
  }

  /**
   * Create entity from DevlogEntry interface
   */
  static fromDevlogEntry(entry: import('../types/index.js').DevlogEntry): DevlogEntryEntity {
    const entity = new DevlogEntryEntity();

    if (entry.id) entity.id = entry.id;
    entity.key = entry.key || '';
    entity.title = entry.title;
    entity.type = entry.type;
    entity.description = entry.description;
    entity.status = entry.status;
    entity.priority = entry.priority;
    entity.createdAt = new Date(entry.createdAt);
    entity.updatedAt = new Date(entry.updatedAt);
    if (entry.closedAt) entity.closedAt = new Date(entry.closedAt);
    entity.archived = entry.archived || false;
    entity.assignee = entry.assignee;
    entity.projectId = entry.projectId;
    entity.acceptanceCriteria = entity.stringifyJsonField(entry.acceptanceCriteria || []);
    entity.businessContext = entry.businessContext;
    entity.technicalContext = entry.technicalContext;

    return entity;
  }

  /**
   * Helper method for JSON field parsing (database-specific)
   */
  private parseJsonField<T>(value: any, defaultValue: T): T {
    if (value === null || value === undefined) {
      return defaultValue;
    }

    // For SQLite, values are stored as text and need parsing
    if (getStorageType() === 'sqlite' && typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    }

    // For PostgreSQL and MySQL, JSON fields are handled natively
    return value;
  }

  /**
   * Helper method for JSON field stringification (database-specific)
   */
  private stringifyJsonField(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    // For SQLite, we need to stringify JSON data
    if (getStorageType() === 'sqlite') {
      return typeof value === 'string' ? value : JSON.stringify(value);
    }

    // For PostgreSQL and MySQL, return the object directly
    return value;
  }
}
