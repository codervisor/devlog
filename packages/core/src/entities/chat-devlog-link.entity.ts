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

  /**
   * Convert entity to ChatDevlogLink interface
   */
  toChatDevlogLink(): import('../types/index.js').ChatDevlogLink {
    return {
      sessionId: this.sessionId,
      devlogId: this.devlogId,
      confidence: this.confidence,
      reason: this.reason,
      evidence: this.parseJsonField(this.evidence, {}),
      confirmed: this.confirmed,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
    };
  }

  /**
   * Create entity from ChatDevlogLink interface
   */
  static fromChatDevlogLink(
    link: import('../types/index.js').ChatDevlogLink,
  ): ChatDevlogLinkEntity {
    const entity = new ChatDevlogLinkEntity();

    entity.sessionId = link.sessionId;
    entity.devlogId = link.devlogId;
    entity.confidence = link.confidence;
    entity.reason = link.reason;
    entity.evidence = entity.stringifyJsonField(link.evidence || {});
    entity.confirmed = link.confirmed;
    entity.createdAt = link.createdAt;
    entity.createdBy = link.createdBy;

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
