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

  /**
   * Convert entity to ChatMessage interface
   */
  toChatMessage(): import('../types/index.js').ChatMessage {
    return {
      id: this.id,
      sessionId: this.sessionId,
      role: this.role,
      content: this.content,
      timestamp: this.timestamp,
      sequence: this.sequence,
      metadata: this.parseJsonField(this.metadata, {}),
      searchContent: this.searchContent,
    };
  }

  /**
   * Create entity from ChatMessage interface
   */
  static fromChatMessage(message: import('../types/index.js').ChatMessage): ChatMessageEntity {
    const entity = new ChatMessageEntity();

    entity.id = message.id;
    entity.sessionId = message.sessionId;
    entity.role = message.role;
    entity.content = message.content;
    entity.timestamp = message.timestamp;
    entity.sequence = message.sequence;
    entity.metadata = entity.stringifyJsonField(message.metadata || {});
    entity.searchContent = message.searchContent;

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
