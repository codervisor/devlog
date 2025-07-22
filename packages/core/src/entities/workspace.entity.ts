/**
 * Used for cloud deployments where file-based storage isn't viable
 */

import 'reflect-metadata';
import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import type { StorageConfig, WorkspaceMetadata } from '../types/index.js';
import { JsonColumn, TimestampColumn, getTimestampType } from './decorators.js';

@Entity('devlog_workspaces')
export class WorkspaceEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @JsonColumn({ nullable: true })
  settings?: Record<string, any>;

  @JsonColumn()
  storage!: StorageConfig;

  @CreateDateColumn({
    type: getTimestampType(),
    name: 'created_at',
  })
  createdAt!: Date;

  @TimestampColumn({ name: 'last_accessed_at' })
  lastAccessedAt!: Date;

  /**
   * Convert entity to WorkspaceMetadata type
   */
  toWorkspaceMetadata(): WorkspaceMetadata {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      settings: this.settings || {},
      createdAt: this.createdAt,
      lastAccessedAt: this.lastAccessedAt,
    };
  }

  /**
   * Create entity from WorkspaceMetadata and storage config
   */
  static fromWorkspaceData(
    workspace: Omit<WorkspaceMetadata, 'createdAt' | 'lastAccessedAt'>,
    storage: StorageConfig,
  ): WorkspaceEntity {
    const entity = new WorkspaceEntity();
    entity.id = workspace.id;
    entity.name = workspace.name;
    entity.description = workspace.description;
    entity.settings = workspace.settings;
    entity.storage = storage;
    entity.lastAccessedAt = new Date();
    return entity;
  }

  /**
   * Update entity with partial workspace data
   */
  updateFromWorkspaceData(updates: Partial<WorkspaceMetadata>): void {
    if (updates.name !== undefined) this.name = updates.name;
    if (updates.description !== undefined) this.description = updates.description;
    if (updates.settings !== undefined) this.settings = updates.settings;
    this.lastAccessedAt = new Date();
  }
}
