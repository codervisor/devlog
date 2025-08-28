/**
 * DevlogDocument entity - separate table for devlog document attachments
 * Stores file metadata and content for documents associated with devlog entries
 */

import 'reflect-metadata';
import { Column, Entity, Index, ManyToOne, JoinColumn, PrimaryColumn, CreateDateColumn } from 'typeorm';
import type { DocumentType } from '../types/index.js';
import { DevlogEntryEntity } from './devlog-entry.entity.js';
import { JsonColumn, getTimestampType } from './decorators.js';

@Entity('devlog_documents')
@Index(['devlogId'])
@Index(['uploadedAt'])
@Index(['type'])
@Index(['mimeType'])
export class DevlogDocumentEntity {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id!: string;

  @Column({ type: 'integer', name: 'devlog_id' })
  devlogId!: number;

  @Column({ type: 'varchar', length: 255 })
  filename!: string;

  @Column({ type: 'varchar', length: 255, name: 'original_name' })
  originalName!: string;

  @Column({ type: 'varchar', length: 255, name: 'mime_type' })
  mimeType!: string;

  @Column({ type: 'integer' })
  size!: number;

  @Column({
    type: 'varchar',
    length: 50,
    enum: ['text', 'markdown', 'image', 'pdf', 'code', 'json', 'csv', 'log', 'config', 'other'],
  })
  type!: DocumentType;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @JsonColumn({ nullable: true })
  metadata?: string; // Stored as JSON string, parsed in toDevlogDocument()

  @CreateDateColumn({
    type: getTimestampType(),
    name: 'uploaded_at',
  })
  uploadedAt!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'uploaded_by' })
  uploadedBy?: string;

  // Foreign key relationship
  @ManyToOne(() => DevlogEntryEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'devlog_id' })
  devlogEntry!: DevlogEntryEntity;

  /**
   * Convert entity to DevlogDocument interface
   */
  toDevlogDocument(): import('../types/index.js').DevlogDocument {
    return {
      id: this.id,
      devlogId: this.devlogId,
      filename: this.filename,
      originalName: this.originalName,
      mimeType: this.mimeType,
      size: this.size,
      type: this.type,
      content: this.content,
      metadata: this.parseJsonField(this.metadata, {}),
      uploadedAt: this.uploadedAt.toISOString(),
      uploadedBy: this.uploadedBy,
    };
  }

  /**
   * Create entity from DevlogDocument interface
   */
  static fromDevlogDocument(document: import('../types/index.js').DevlogDocument): DevlogDocumentEntity {
    const entity = new DevlogDocumentEntity();

    entity.id = document.id;
    entity.devlogId = document.devlogId;
    entity.filename = document.filename;
    entity.originalName = document.originalName;
    entity.mimeType = document.mimeType;
    entity.size = document.size;
    entity.type = document.type;
    entity.content = document.content;
    entity.metadata = entity.stringifyJsonField(document.metadata || {});
    entity.uploadedAt = new Date(document.uploadedAt);
    entity.uploadedBy = document.uploadedBy;

    return entity;
  }

  /**
   * Helper method for JSON field parsing (database-specific)
   */
  public parseJsonField<T>(value: any, defaultValue: T): T {
    if (value === null || value === undefined) {
      return defaultValue;
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * Helper method for JSON field stringification (database-specific)
   */
  public stringifyJsonField(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    return JSON.stringify(value);
  }
}