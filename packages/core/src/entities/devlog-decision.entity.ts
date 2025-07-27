/**
 * DevlogDecision entity - separate table for devlog decisions
 * Replaces the context.decisions[] array in DevlogEntry
 */

import 'reflect-metadata';
import { Column, Entity, Index, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { DevlogEntryEntity } from './devlog-entry.entity.js';
import { JsonColumn, TimestampColumn } from './decorators.js';

@Entity('devlog_decisions')
@Index(['devlogId'])
@Index(['timestamp'])
@Index(['decisionMaker'])
export class DevlogDecisionEntity {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id!: string;

  @Column({ type: 'integer', name: 'devlog_id' })
  devlogId!: number;

  @TimestampColumn()
  timestamp!: Date;

  @Column({ type: 'text' })
  decision!: string;

  @Column({ type: 'text' })
  rationale!: string;

  @JsonColumn({ default: [], nullable: true })
  alternatives?: string[];

  @Column({ type: 'varchar', length: 255, name: 'decision_maker' })
  decisionMaker!: string;

  // Foreign key relationship
  @ManyToOne(() => DevlogEntryEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'devlog_id' })
  devlogEntry!: DevlogEntryEntity;
}
