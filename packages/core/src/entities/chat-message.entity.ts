/**
 * TypeORM entity for chat messages
 * Maps to the ChatMessage interface and chat_messages table
 */

import 'reflect-metadata';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { ChatRole } from '../types/index.js';
import { JsonColumn, getStorageType } from './decorators.js';

/**
 * Chat message entity matching the ChatMessage interface
 */
@Entity('chat_messages')
@Index(['sessionId'])
@Index(['timestamp'])
@Index(['role'])
@Index(['sessionId', 'sequence'])
export class ChatMessageEntity {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id!: string;

  @Column({ type: 'varchar', length: 255, name: 'session_id' })
  sessionId!: string;

  @Column({ type: 'varchar', length: 20 })
  role!: ChatRole;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 255 })
  timestamp!: string; // ISO string

  @Column({ type: 'integer' })
  sequence!: number;

  @JsonColumn({ default: getStorageType() === 'sqlite' ? '{}' : {} })
  metadata!: Record<string, any>;

  @Column({ type: 'text', nullable: true, name: 'search_content' })
  searchContent?: string;
}
