/**
 * TypeORM entity for chat sessions
 * Maps to the ChatSession interface and chat_sessions table
 */

import 'reflect-metadata';
import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import type { AgentType, ChatStatus } from '../types/index.js';
import { JsonColumn, getStorageType } from './decorators.js';

/**
 * Chat session entity matching the ChatSession interface
 */
@Entity('chat_sessions')
@Index(['agent'])
@Index(['timestamp'])
@Index(['workspace'])
@Index(['status'])
@Index(['archived'])
export class ChatSessionEntity {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  agent!: AgentType;

  @Column({ type: 'varchar', length: 255 })
  timestamp!: string; // ISO string

  @Column({ type: 'varchar', length: 500, nullable: true })
  workspace?: string;

  @Column({ type: 'varchar', length: 1000, nullable: true, name: 'workspace_path' })
  workspacePath?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  title?: string;

  @Column({ type: 'varchar', length: 50, default: 'imported' })
  status!: ChatStatus;

  @Column({ type: 'integer', default: 0, name: 'message_count' })
  messageCount!: number;

  @Column({ type: 'integer', nullable: true })
  duration?: number;

  @JsonColumn({ default: getStorageType() === 'sqlite' ? '{}' : {} })
  metadata!: Record<string, any>;

  @Column({ type: 'varchar', length: 255, name: 'updated_at' })
  updatedAt!: string; // ISO string

  @Column({ type: 'boolean', default: false })
  archived!: boolean;
}
