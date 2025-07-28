/**
 * Project Entity for database storage
 *
 * Simplified compared to WorkspaceEntity - no per-project storage configuration.
 * All projects share the same centralized database configuration.
 */

import 'reflect-metadata';
import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import type { ProjectMetadata, ProjectSettings } from '../types/index.js';
import { JsonColumn, TimestampColumn, getTimestampType } from './decorators.js';

@Entity('devlog_projects')
export class ProjectEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  repositoryUrl?: string;

  @JsonColumn({ nullable: true })
  settings?: ProjectSettings;

  @JsonColumn({ nullable: true })
  tags?: string[];

  @CreateDateColumn({
    type: getTimestampType(),
    name: 'created_at',
  })
  createdAt!: Date;

  @TimestampColumn({ name: 'last_accessed_at' })
  lastAccessedAt!: Date;

  /**
   * Convert entity to ProjectMetadata type
   */
  toProjectMetadata(): ProjectMetadata {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      repositoryUrl: this.repositoryUrl,
      settings: this.settings || {},
      tags: this.tags || [],
      createdAt: this.createdAt,
      lastAccessedAt: this.lastAccessedAt,
    };
  }

  /**
   * Create entity from ProjectMetadata
   */
  static fromProjectData(
    project: Omit<ProjectMetadata, 'createdAt' | 'lastAccessedAt'>,
  ): ProjectEntity {
    const entity = new ProjectEntity();
    entity.id = project.id;
    entity.name = project.name;
    entity.description = project.description;
    entity.repositoryUrl = project.repositoryUrl;
    entity.settings = project.settings;
    entity.tags = project.tags;
    entity.lastAccessedAt = new Date();
    return entity;
  }

  /**
   * Update entity with partial project data
   */
  updateFromProjectData(updates: Partial<ProjectMetadata>): void {
    if (updates.name !== undefined) this.name = updates.name;
    if (updates.description !== undefined) this.description = updates.description;
    if (updates.repositoryUrl !== undefined) this.repositoryUrl = updates.repositoryUrl;
    if (updates.settings !== undefined) this.settings = updates.settings;
    if (updates.tags !== undefined) this.tags = updates.tags;
    this.lastAccessedAt = new Date();
  }
}
