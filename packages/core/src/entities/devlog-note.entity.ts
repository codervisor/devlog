/**
 * DevlogNote entity - separate table for devlog notes
 * Replaces the notes[] array in DevlogEntry for better relational modeling
 */

import 'reflect-metadata';
import { Column, Entity, Index, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import type { NoteCategory } from '../types/index.js';
import { DevlogEntryEntity } from './devlog-entry.entity.js';
import { JsonColumn, TimestampColumn } from './decorators.js';

@Entity('devlog_notes')
@Index(['devlogId'])
@Index(['timestamp'])
@Index(['category'])
export class DevlogNoteEntity {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id!: string;

  @Column({ type: 'integer', name: 'devlog_id' })
  devlogId!: number;

  @TimestampColumn()
  timestamp!: Date;

  @Column({
    type: 'varchar',
    length: 50,
    enum: ['progress', 'issue', 'solution', 'idea', 'reminder', 'feedback', 'acceptance-criteria'],
  })
  category!: NoteCategory;

  @Column({ type: 'text' })
  content!: string;

  // Foreign key relationship
  @ManyToOne(() => DevlogEntryEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'devlog_id' })
  devlogEntry!: DevlogEntryEntity;
}
