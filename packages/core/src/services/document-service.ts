/**
 * DocumentService - Business logic for devlog document operations
 *
 * Handles CRUD operations for documents associated with devlog entries,
 * including file uploads, metadata management, and content indexing.
 */

import { DataSource, Repository } from 'typeorm';
import type { DevlogDocument, DevlogId } from '../types/index.js';
import { DevlogDocumentEntity, DevlogEntryEntity } from '../entities/index.js';
import { getDataSource } from '../utils/typeorm-config.js';
import { generateDocumentId } from '../utils/id-generator.js';
import * as crypto from 'crypto';
import * as path from 'path';

interface DocumentServiceInstance {
  service: DocumentService;
  createdAt: number;
}

export class DocumentService {
  private static instances: Map<number, DocumentServiceInstance> = new Map();
  private static readonly TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
  private database: DataSource;
  private documentRepository: Repository<DevlogDocumentEntity>;
  private devlogRepository: Repository<DevlogEntryEntity>;
  private initPromise: Promise<void> | null = null;

  private constructor(private projectId?: number) {
    // Database initialization will happen in ensureInitialized()
    this.database = null as any; // Temporary placeholder
    this.documentRepository = null as any; // Temporary placeholder
    this.devlogRepository = null as any; // Temporary placeholder
  }

  /**
   * Get singleton instance for a project
   */
  static getInstance(projectId?: number): DocumentService {
    const key = projectId || 0;
    const now = Date.now();

    // Clean up expired instances
    for (const [instanceKey, instance] of this.instances.entries()) {
      if (now - instance.createdAt > this.TTL_MS) {
        this.instances.delete(instanceKey);
      }
    }

    let instance = this.instances.get(key);
    if (!instance) {
      instance = {
        service: new DocumentService(projectId),
        createdAt: now,
      };
      this.instances.set(key, instance);
    }

    return instance.service;
  }

  /**
   * Ensure service is initialized
   */
  async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    this.database = await getDataSource();
    this.documentRepository = this.database.getRepository(DevlogDocumentEntity);
    this.devlogRepository = this.database.getRepository(DevlogEntryEntity);
  }

  /**
   * Upload a document and associate it with a devlog entry
   */
  async uploadDocument(
    devlogId: DevlogId,
    file: {
      originalName: string;
      mimeType: string;
      size: number;
      content?: Buffer | string;
    },
    options?: {
      uploadedBy?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<DevlogDocument> {
    await this.ensureInitialized();

    // Verify devlog exists
    const devlogExists = await this.devlogRepository.findOne({
      where: { id: devlogId, ...(this.projectId && { projectId: this.projectId }) },
    });

    if (!devlogExists) {
      throw new Error(`Devlog entry ${devlogId} not found`);
    }

    // Generate unique document ID and filename
    const documentId = generateDocumentId(devlogId, file.originalName);
    const extension = path.extname(file.originalName);
    const filename = `${documentId}${extension}`;

    // Determine document type from mime type and extension
    const type = this.determineDocumentType(file.mimeType, extension);

    // Extract text content for searchable documents
    let textContent: string | undefined;
    if (file.content && this.isTextBasedType(type)) {
      textContent = this.extractTextContent(file.content, type);
    }

    // Create document entity
    const document: DevlogDocument = {
      id: documentId,
      devlogId,
      filename,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      type,
      content: textContent,
      metadata: options?.metadata,
      uploadedAt: new Date().toISOString(),
      uploadedBy: options?.uploadedBy,
    };

    const entity = DevlogDocumentEntity.fromDevlogDocument(document);
    const savedEntity = await this.documentRepository.save(entity);

    return savedEntity.toDevlogDocument();
  }

  /**
   * Get a specific document by ID
   */
  async getDocument(documentId: string): Promise<DevlogDocument | null> {
    await this.ensureInitialized();

    const entity = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: ['devlogEntry'],
    });

    if (!entity) {
      return null;
    }

    // Check project access if projectId is set
    if (this.projectId && entity.devlogEntry.projectId !== this.projectId) {
      return null;
    }

    return entity.toDevlogDocument();
  }

  /**
   * List documents for a devlog entry
   */
  async listDocuments(devlogId: DevlogId): Promise<DevlogDocument[]> {
    await this.ensureInitialized();

    const entities = await this.documentRepository.find({
      where: { devlogId },
      order: { uploadedAt: 'DESC' },
      relations: ['devlogEntry'],
    });

    // Filter by project if projectId is set
    const filteredEntities = this.projectId
      ? entities.filter(entity => entity.devlogEntry.projectId === this.projectId)
      : entities;

    return filteredEntities.map(entity => entity.toDevlogDocument());
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    await this.ensureInitialized();

    const entity = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: ['devlogEntry'],
    });

    if (!entity) {
      return false;
    }

    // Check project access if projectId is set
    if (this.projectId && entity.devlogEntry.projectId !== this.projectId) {
      return false;
    }

    await this.documentRepository.remove(entity);
    return true;
  }

  /**
   * Update document metadata
   */
  async updateDocument(
    documentId: string,
    updates: {
      metadata?: Record<string, any>;
      content?: string;
    }
  ): Promise<DevlogDocument | null> {
    await this.ensureInitialized();

    const entity = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: ['devlogEntry'],
    });

    if (!entity) {
      return null;
    }

    // Check project access if projectId is set
    if (this.projectId && entity.devlogEntry.projectId !== this.projectId) {
      return null;
    }

    if (updates.metadata !== undefined) {
      entity.metadata = entity.stringifyJsonField(updates.metadata);
    }

    if (updates.content !== undefined) {
      entity.content = updates.content;
    }

    const savedEntity = await this.documentRepository.save(entity);
    return savedEntity.toDevlogDocument();
  }

  /**
   * Search documents by content
   */
  async searchDocuments(
    query: string,
    devlogId?: DevlogId
  ): Promise<DevlogDocument[]> {
    await this.ensureInitialized();

    let queryBuilder = this.documentRepository
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.devlogEntry', 'devlog');

    // Add project filter if projectId is set
    if (this.projectId) {
      queryBuilder = queryBuilder.where('devlog.projectId = :projectId', { projectId: this.projectId });
    }

    // Add devlog filter if specified
    if (devlogId) {
      queryBuilder = queryBuilder.andWhere('doc.devlogId = :devlogId', { devlogId });
    }

    // Add content search
    queryBuilder = queryBuilder.andWhere(
      '(doc.content ILIKE :query OR doc.originalName ILIKE :query OR doc.filename ILIKE :query)',
      { query: `%${query}%` }
    );

    queryBuilder = queryBuilder.orderBy('doc.uploadedAt', 'DESC');

    const entities = await queryBuilder.getMany();
    return entities.map(entity => entity.toDevlogDocument());
  }

  /**
   * Determine document type from MIME type and file extension
   */
  private determineDocumentType(mimeType: string, extension: string): import('../types/index.js').DocumentType {
    // Image types
    if (mimeType.startsWith('image/')) {
      return 'image';
    }

    // PDF
    if (mimeType === 'application/pdf') {
      return 'pdf';
    }

    // Text-based types
    if (mimeType.startsWith('text/')) {
      if (mimeType === 'text/markdown' || extension === '.md') {
        return 'markdown';
      }
      if (extension === '.csv') {
        return 'csv';
      }
      if (extension === '.log') {
        return 'log';
      }
      return 'text';
    }

    // JSON
    if (mimeType === 'application/json' || extension === '.json') {
      return 'json';
    }

    // Code files
    const codeExtensions = ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.php', '.rb', '.swift', '.kt'];
    if (codeExtensions.includes(extension.toLowerCase())) {
      return 'code';
    }

    // Config files
    const configExtensions = ['.env', '.conf', '.ini', '.yaml', '.yml', '.toml', '.properties'];
    if (configExtensions.includes(extension.toLowerCase())) {
      return 'config';
    }

    return 'other';
  }

  /**
   * Check if document type supports text content extraction
   */
  private isTextBasedType(type: import('../types/index.js').DocumentType): boolean {
    return ['text', 'markdown', 'code', 'json', 'csv', 'log', 'config'].includes(type);
  }

  /**
   * Extract text content from file content
   */
  private extractTextContent(content: Buffer | string, type: import('../types/index.js').DocumentType): string {
    if (typeof content === 'string') {
      return content;
    }

    // For text-based files, convert buffer to string
    if (this.isTextBasedType(type)) {
      return content.toString('utf-8');
    }

    return '';
  }
}