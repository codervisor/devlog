/**
 * DevlogDependency entity - separate table for devlog dependencies
 * Replaces the context.dependencies[] array in DevlogEntry
 * Essential for hierarchical work item management (epic->phase->story)
 */

import 'reflect-metadata';
import { Column, Entity, Index, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { DevlogEntryEntity } from './devlog-entry.entity.js';

@Entity('devlog_dependencies')
@Index(['devlogId'])
@Index(['type'])
@Index(['targetDevlogId'])
export class DevlogDependencyEntity {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id!: string;

  @Column({ type: 'integer', name: 'devlog_id' })
  devlogId!: number;

  @Column({
    type: 'varchar',
    length: 50,
    enum: ['blocks', 'blocked-by', 'related-to', 'parent-of', 'child-of'],
  })
  type!: 'blocks' | 'blocked-by' | 'related-to' | 'parent-of' | 'child-of';

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'external_id' })
  externalId?: string;

  // Target devlog ID for internal dependencies (epic->phase->story relationships)
  @Column({ type: 'integer', nullable: true, name: 'target_devlog_id' })
  targetDevlogId?: number;

  // Foreign key relationship to source devlog
  @ManyToOne(() => DevlogEntryEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'devlog_id' })
  devlogEntry!: DevlogEntryEntity;

  // Optional foreign key relationship to target devlog (for internal dependencies)
  @ManyToOne(() => DevlogEntryEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'target_devlog_id' })
  targetDevlogEntry?: DevlogEntryEntity;
}
