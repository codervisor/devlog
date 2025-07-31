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
@Index(['importedAt'])
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

  @JsonColumn({ default: getStorageType() === 'sqlite' ? '[]' : [] })
  tags!: string[];

  @Column({ type: 'varchar', length: 255, name: 'imported_at' })
  importedAt!: string; // ISO string

  @Column({ type: 'varchar', length: 255, name: 'updated_at' })
  updatedAt!: string; // ISO string

  @Column({ type: 'boolean', default: false })
  archived!: boolean;

  @JsonColumn({ default: getStorageType() === 'sqlite' ? '[]' : [], name: 'linked_devlogs' })
  linkedDevlogs!: number[];

  /**
   * Convert entity to ChatSession interface
   */
  toChatSession(): import('../types/index.js').ChatSession {
    return {
      id: this.id,
      agent: this.agent,
      timestamp: this.timestamp,
      workspace: this.workspace,
      workspacePath: this.workspacePath,
      title: this.title,
      status: this.status,
      messageCount: this.messageCount,
      duration: this.duration,
      metadata: this.parseJsonField(this.metadata, {}),
      tags: this.parseJsonField(this.tags, []),
      importedAt: this.importedAt,
      updatedAt: this.updatedAt,
      linkedDevlogs: this.parseJsonField(this.linkedDevlogs, []),
      archived: this.archived,
    };
  }

  /**
   * Create entity from ChatSession interface
   */
  static fromChatSession(session: import('../types/index.js').ChatSession): ChatSessionEntity {
    const entity = new ChatSessionEntity();

    entity.id = session.id;
    entity.agent = session.agent;
    entity.timestamp = session.timestamp;
    entity.workspace = session.workspace;
    entity.workspacePath = session.workspacePath;
    entity.title = session.title;
    entity.status = session.status || 'imported';
    entity.messageCount = session.messageCount || 0;
    entity.duration = session.duration;
    entity.metadata = entity.stringifyJsonField(session.metadata || {});
    entity.tags = entity.stringifyJsonField(session.tags || []);
    entity.importedAt = session.importedAt;
    entity.updatedAt = session.updatedAt;
    entity.linkedDevlogs = entity.stringifyJsonField(session.linkedDevlogs || []);
    entity.archived = session.archived || false;

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
