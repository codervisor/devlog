/**
 * Document Service
 *
 * Manages document attachments for devlog entries
 * Handles file uploads, type detection, content extraction, and storage
 * 
 * Features:
 * - File upload and storage
 * - Document type detection and classification
 * - Text content extraction for searchable documents
 * - Metadata management
 * - File retrieval and deletion
 */

import type { DevlogDocument, DocumentType, DevlogId } from '../types/index.js';
import { PrismaServiceBase } from './prisma-service-base.js';

interface DocumentServiceInstance {
  service: PrismaDocumentService;
  createdAt: number;
}

/**
 * Service for managing document attachments to devlog entries
 */
export class PrismaDocumentService extends PrismaServiceBase {
  private static instances: Map<string, DocumentServiceInstance> = new Map();

  private constructor() {
    super();
  }

  /**
   * Get or create a DocumentService instance
   * Implements singleton pattern with TTL-based cleanup
   */
  static getInstance(): PrismaDocumentService {
    const key = 'default';
    
    return this.getOrCreateInstance(this.instances, key, () => new PrismaDocumentService());
  }

  /**
   * Hook called when Prisma client is successfully connected
   */
  protected async onPrismaConnected(): Promise<void> {
    console.log('[DocumentService] Document service initialized with database connection');
  }

  /**
   * Hook called when service is running in fallback mode
   */
  protected async onFallbackMode(): Promise<void> {
    console.log('[DocumentService] Document service initialized in fallback mode');
  }

  /**
   * Hook called during disposal for cleanup
   */
  protected async onDispose(): Promise<void> {
    // Remove from instances map
    for (const [key, instance] of PrismaDocumentService.instances.entries()) {
      if (instance.service === this) {
        PrismaDocumentService.instances.delete(key);
        break;
      }
    }
  }

  /**
   * Upload a document and attach it to a devlog entry
   */
  async uploadDocument(
    devlogId: DevlogId,
    file: {
      originalName: string;
      mimeType: string;
      size: number;
      content: Buffer | string;
    },
    metadata?: Record<string, any>,
    uploadedBy?: string
  ): Promise<DevlogDocument> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      console.warn('[DocumentService] uploadDocument() called in fallback mode - returning mock document');
      
      const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const documentType = this.determineDocumentType(file.mimeType, file.originalName);
      const textContent = this.extractTextContent(file.content, documentType);

      return {
        id: documentId,
        devlogId: Number(devlogId),
        filename: documentId,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        type: documentType,
        content: textContent,
        metadata: metadata || {},
        uploadedAt: new Date().toISOString(),
        uploadedBy,
      };
    }

    try {
      const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const documentType = this.determineDocumentType(file.mimeType, file.originalName);
      const textContent = this.extractTextContent(file.content, documentType);

      // Store both text content and metadata as JSON in the content field
      const documentContent = JSON.stringify({
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        type: documentType,
        uploadedBy,
        metadata: metadata || {},
        textContent: textContent || '',
        binaryContent: Buffer.isBuffer(file.content) 
          ? file.content.toString('base64')
          : Buffer.from(file.content, 'utf-8').toString('base64')
      });

      const document = await this.prismaClient!.devlogDocument.create({
        data: {
          id: documentId,
          devlogId: Number(devlogId),
          title: file.originalName,
          content: documentContent,
          contentType: file.mimeType,
        },
      });

      return this.mapPrismaToDocument(document);
    } catch (error) {
      console.error('[DocumentService] Failed to upload document:', error);
      throw new Error(`Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a document by ID
   */
  async getDocument(documentId: string): Promise<DevlogDocument | null> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      console.warn('[DocumentService] getDocument() called in fallback mode - returning null');
      return null;
    }

    try {
      const document = await this.prismaClient!.devlogDocument.findUnique({
        where: { id: documentId },
      });

      return document ? this.mapPrismaToDocument(document) : null;
    } catch (error) {
      console.error('[DocumentService] Failed to get document:', error);
      throw new Error(`Failed to get document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all documents for a devlog entry
   */
  async getDevlogDocuments(devlogId: DevlogId): Promise<DevlogDocument[]> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      console.warn('[DocumentService] getDevlogDocuments() called in fallback mode - returning empty array');
      return [];
    }

    try {
      const documents = await this.prismaClient!.devlogDocument.findMany({
        where: { devlogId: Number(devlogId) },
        orderBy: { createdAt: 'desc' },
      });

      return documents.map(doc => this.mapPrismaToDocument(doc));
    } catch (error) {
      console.error('[DocumentService] Failed to get devlog documents:', error);
      throw new Error(`Failed to get devlog documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get document content (binary data)
   */
  async getDocumentContent(documentId: string): Promise<Buffer | null> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      console.warn('[DocumentService] getDocumentContent() called in fallback mode - returning null');
      return null;
    }

    try {
      const document = await this.prismaClient!.devlogDocument.findUnique({
        where: { id: documentId },
        select: { content: true },
      });

      if (!document?.content) {
        return null;
      }

      try {
        const parsedContent = JSON.parse(document.content);
        if (parsedContent.binaryContent) {
          return Buffer.from(parsedContent.binaryContent, 'base64');
        }
      } catch {
        // If content is not JSON, treat as plain text
        return Buffer.from(document.content, 'utf-8');
      }

      return null;
    } catch (error) {
      console.error('[DocumentService] Failed to get document content:', error);
      throw new Error(`Failed to get document content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search documents by content and metadata
   */
  async searchDocuments(
    query: string,
    options?: {
      devlogId?: DevlogId;
      type?: DocumentType;
      mimeType?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ documents: DevlogDocument[]; total: number }> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      console.warn('[DocumentService] searchDocuments() called in fallback mode - returning empty result');
      return { documents: [], total: 0 };
    }

    try {
      const where: any = {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
      };

      if (options?.devlogId) where.devlogId = Number(options.devlogId);
      if (options?.mimeType) where.contentType = { contains: options.mimeType };

      const [documents, total] = await Promise.all([
        this.prismaClient!.devlogDocument.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: options?.limit || 20,
          skip: options?.offset || 0,
        }),
        this.prismaClient!.devlogDocument.count({ where }),
      ]);

      return {
        documents: documents.map(doc => this.mapPrismaToDocument(doc)),
        total,
      };
    } catch (error) {
      console.error('[DocumentService] Failed to search documents:', error);
      throw new Error(`Failed to search documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update document metadata
   */
  async updateDocumentMetadata(
    documentId: string,
    metadata: Record<string, any>
  ): Promise<DevlogDocument> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      console.warn('[DocumentService] updateDocumentMetadata() called in fallback mode - returning mock document');
      const existing = await this.getDocument(documentId);
      if (!existing) {
        throw new Error('Document not found');
      }
      
      return {
        ...existing,
        metadata,
      };
    }

    try {
      // Get existing document
      const existingDoc = await this.prismaClient!.devlogDocument.findUnique({
        where: { id: documentId },
      });

      if (!existingDoc) {
        throw new Error('Document not found');
      }

      // Parse existing content and update metadata
      let parsedContent;
      try {
        parsedContent = JSON.parse(existingDoc.content);
      } catch {
        parsedContent = { metadata: {} };
      }

      parsedContent.metadata = { ...parsedContent.metadata, ...metadata };

      const document = await this.prismaClient!.devlogDocument.update({
        where: { id: documentId },
        data: { content: JSON.stringify(parsedContent) },
      });

      return this.mapPrismaToDocument(document);
    } catch (error) {
      console.error('[DocumentService] Failed to update document metadata:', error);
      throw new Error(`Failed to update document metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      console.warn('[DocumentService] deleteDocument() called in fallback mode - operation ignored');
      return;
    }

    try {
      await this.prismaClient!.devlogDocument.delete({
        where: { id: documentId },
      });
    } catch (error) {
      console.error('[DocumentService] Failed to delete document:', error);
      throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete all documents for a devlog entry
   */
  async deleteDevlogDocuments(devlogId: DevlogId): Promise<void> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      console.warn('[DocumentService] deleteDevlogDocuments() called in fallback mode - operation ignored');
      return;
    }

    try {
      await this.prismaClient!.devlogDocument.deleteMany({
        where: { devlogId: Number(devlogId) },
      });
    } catch (error) {
      console.error('[DocumentService] Failed to delete devlog documents:', error);
      throw new Error(`Failed to delete devlog documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get document statistics for a devlog entry
   */
  async getDocumentStats(devlogId: DevlogId): Promise<{
    totalDocuments: number;
    totalSize: number;
    typeBreakdown: Record<DocumentType, number>;
  }> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      console.warn('[DocumentService] getDocumentStats() called in fallback mode - returning empty stats');
      return {
        totalDocuments: 0,
        totalSize: 0,
        typeBreakdown: {} as Record<DocumentType, number>,
      };
    }

    try {
      const documents = await this.prismaClient!.devlogDocument.findMany({
        where: { devlogId: Number(devlogId) },
        select: { content: true, contentType: true },
      });

      const totalDocuments = documents.length;
      let totalSize = 0;
      const typeBreakdown: Record<string, number> = {};

      documents.forEach(doc => {
        try {
          const parsedContent = JSON.parse(doc.content);
          if (parsedContent.size) {
            totalSize += parsedContent.size;
          }
          if (parsedContent.type) {
            typeBreakdown[parsedContent.type] = (typeBreakdown[parsedContent.type] || 0) + 1;
          }
        } catch {
          // If content is not JSON, estimate size and use contentType
          totalSize += doc.content.length;
          const documentType = this.determineDocumentType(doc.contentType, '');
          typeBreakdown[documentType] = (typeBreakdown[documentType] || 0) + 1;
        }
      });

      return {
        totalDocuments,
        totalSize,
        typeBreakdown: typeBreakdown as Record<DocumentType, number>,
      };
    } catch (error) {
      console.error('[DocumentService] Failed to get document stats:', error);
      throw new Error(`Failed to get document stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Determine document type based on MIME type and filename
   */
  private determineDocumentType(mimeType: string, filename: string): DocumentType {
    const extension = filename.toLowerCase().split('.').pop() || '';
    
    // Check by file extension first (more specific than MIME type)
    const codeExtensions = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'hpp', 'cs', 'php', 'rb', 'go', 'rs', 'kt', 'swift', 'scala', 'sh', 'bash', 'ps1', 'sql', 'r', 'matlab', 'm', 'vb', 'pl', 'dart', 'lua'];
    const configExtensions = ['json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'config', 'properties', 'env', 'dockerfile'];
    const logExtensions = ['log', 'logs', 'out', 'err'];

    if (extension === 'md' || extension === 'markdown') return 'markdown';
    if (extension === 'pdf') return 'pdf';
    if (extension === 'json') return 'json';
    if (extension === 'csv') return 'csv';
    if (codeExtensions.includes(extension)) return 'code';
    if (configExtensions.includes(extension)) return 'config';
    if (logExtensions.includes(extension)) return 'log';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'bmp', 'webp'].includes(extension)) return 'image';

    // Then check by MIME type
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType === 'application/json' || mimeType === 'text/json') return 'json';
    if (mimeType === 'text/csv' || mimeType === 'application/csv') return 'csv';
    if (mimeType === 'text/markdown') return 'markdown';
    if (mimeType.startsWith('text/')) return 'text';

    // Default to other for unknown types
    return 'other';
  }

  /**
   * Check if document type is text-based and can have content extracted
   */
  private isTextBasedType(type: DocumentType): boolean {
    return ['text', 'markdown', 'code', 'json', 'csv', 'log', 'config'].includes(type);
  }

  /**
   * Extract text content from file content for text-based documents
   */
  private extractTextContent(content: Buffer | string, type: DocumentType): string {
    if (!this.isTextBasedType(type)) {
      return ''; // No text content for non-text documents
    }

    try {
      const textContent = Buffer.isBuffer(content) 
        ? content.toString('utf-8')
        : content;
      
      // Limit text content size to avoid database issues
      const maxTextSize = 64 * 1024; // 64KB limit
      return textContent.length > maxTextSize 
        ? textContent.substring(0, maxTextSize) + '...[truncated]'
        : textContent;
    } catch (error) {
      console.warn('[DocumentService] Failed to extract text content:', error);
      return '';
    }
  }

  /**
   * Map Prisma document entity to domain type
   */
  private mapPrismaToDocument(prismaDoc: any): DevlogDocument {
    // Try to parse the content as JSON to extract structured data
    let parsedContent: any = {};
    try {
      parsedContent = JSON.parse(prismaDoc.content);
    } catch {
      // If content is not JSON, treat as plain text content
      parsedContent = {
        textContent: prismaDoc.content,
        originalName: prismaDoc.title,
        mimeType: prismaDoc.contentType,
        type: this.determineDocumentType(prismaDoc.contentType, prismaDoc.title),
        size: prismaDoc.content.length,
        metadata: {},
      };
    }

    return {
      id: prismaDoc.id,
      devlogId: prismaDoc.devlogId,
      filename: prismaDoc.id, // Use ID as filename since we don't store it separately
      originalName: parsedContent.originalName || prismaDoc.title,
      mimeType: parsedContent.mimeType || prismaDoc.contentType,
      size: parsedContent.size || prismaDoc.content.length,
      type: parsedContent.type || this.determineDocumentType(prismaDoc.contentType, prismaDoc.title),
      content: parsedContent.textContent || undefined,
      metadata: parsedContent.metadata || {},
      uploadedAt: prismaDoc.createdAt?.toISOString() || new Date().toISOString(),
      uploadedBy: parsedContent.uploadedBy || undefined,
    };
  }

  /**
   * Dispose of the service and clean up resources
   */
  async dispose(): Promise<void> {
    await super.dispose();
  }
}