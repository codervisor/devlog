/**
 * TypeORM entity for chat-devlog links
 * Maps to the ChatDevlogLink interface and chat_devlog_links table
 */

import 'reflect-metadata';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { JsonColumn, getStorageType } from './decorators.js';

/**
 * Chat-devlog link entity for linking sessions to devlog entries
 */
@Entity('chat_devlog_links')
@Index(['sessionId'])
@Index(['devlogId'])
@Index(['reason'])
@Index(['confirmed'])
export class ChatDevlogLinkEntity {
  @PrimaryColumn({ type: 'varchar', length: 255, name: 'session_id' })
  sessionId!: string;

  @PrimaryColumn({ type: 'integer', name: 'devlog_id' })
  devlogId!: number;

  @Column({ type: 'real' })
  confidence!: number;

  @Column({ type: 'varchar', length: 50 })
  reason!: 'temporal' | 'content' | 'workspace' | 'manual';

  @JsonColumn({ default: getStorageType() === 'sqlite' ? '{}' : {} })
  evidence!: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  confirmed!: boolean;

  @Column({ type: 'varchar', length: 255, name: 'created_at' })
  createdAt!: string; // ISO string

  @Column({ type: 'varchar', length: 255, name: 'created_by' })
  createdBy!: string;
}
