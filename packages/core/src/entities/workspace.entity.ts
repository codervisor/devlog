/**
 * TypeORM Entity for workspace metadata persistence
 * Used for cloud deployments where file-based storage isn't viable
 */

import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import type { WorkspaceMetadata, StorageConfig } from '../types/index.js';

@Entity('devlog_workspaces')
export class WorkspaceEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column('jsonb', { nullable: true })
  settings?: Record<string, any>;

  @Column('jsonb')
  storage!: StorageConfig;

  @CreateDateColumn()
  createdAt!: Date;

  @Column()
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
    storage: StorageConfig
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
