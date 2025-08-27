/**
 * MCP Adapter - Clean, AI-friendly implementation
 *
 * Single adapter class that handles all MCP tool operations with:
 * - StandardResponse format for consistency
 * - Direct HTTP API communication
 * - Smart parameter handling with defaults
 * - Type-safe operations using Zod schemas
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DevlogApiClient, type DevlogApiClientConfig } from '../api/devlog-api-client.js';
import { logger } from '../server/index.js';
import type {
  AddDevlogNoteArgs,
  CreateDevlogArgs,
  DeleteDocumentArgs,
  FindRelatedDevlogsArgs,
  GetCurrentProjectArgs,
  GetDevlogArgs,
  GetDocumentArgs,
  ListDevlogArgs,
  ListDevlogNotesArgs,
  ListDocumentsArgs,
  ListProjectsArgs,
  SearchDocumentsArgs,
  SwitchProjectArgs,
  UpdateDevlogArgs,
  UploadDocumentArgs,
} from '../schemas/index.js';

/**
 * Standard response format for all MCP operations
 */
export interface StandardResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

/**
 * Configuration for the MCP adapter
 */
export interface MCPAdapterConfig {
  apiClient: DevlogApiClientConfig;
  defaultProjectId?: number;
}

/**
 * Main MCP adapter class - handles all tool operations
 */
export class MCPAdapter {
  private apiClient: DevlogApiClient;
  private currentProjectId: number;
  private initialized = false;

  constructor(config: MCPAdapterConfig) {
    this.apiClient = new DevlogApiClient(config.apiClient);
    this.currentProjectId = config.defaultProjectId || 1;

    if (this.currentProjectId) {
      this.apiClient.setCurrentProject(this.currentProjectId);
    }
  }

  /**
   * Initialize the adapter and test connection
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.apiClient.healthCheck();
      logger.info('✅ MCP adapter initialized successfully');
      this.initialized = true;
    } catch (error) {
      logger.error('❌ Failed to initialize MCP adapter:', error);
      throw new Error(
        `Failed to connect to devlog API: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get current project ID
   */
  getCurrentProjectId(): number {
    return this.currentProjectId;
  }

  /**
   * Set current project ID
   */
  setCurrentProjectId(projectId: number): void {
    this.currentProjectId = projectId;
    this.apiClient.setCurrentProject(projectId);
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    this.initialized = false;
  }

  // === HELPER METHODS ===

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private toStandardResponse(
    success: boolean,
    data?: any,
    message?: string,
    error?: string,
  ): CallToolResult {
    const response: StandardResponse = { success, data, message, error };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
      isError: !success,
    };
  }

  private handleError(operation: string, error: unknown): CallToolResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`${operation}:`, { error: errorMessage });

    return this.toStandardResponse(false, undefined, undefined, `${operation}: ${errorMessage}`);
  }

  // === DEVLOG OPERATIONS ===

  async createDevlog(args: CreateDevlogArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      const entry = await this.apiClient.createDevlog({
        title: args.title,
        type: args.type,
        description: args.description,
        priority: args.priority,
        businessContext: args.businessContext,
        technicalContext: args.technicalContext,
        acceptanceCriteria: args.acceptanceCriteria,
      });

      return this.toStandardResponse(
        true,
        {
          id: entry.id,
          title: entry.title,
          type: entry.type,
          priority: entry.priority,
          status: entry.status,
        },
        `Created ${args.type}: ${args.title}`,
      );
    } catch (error) {
      return this.handleError('Failed to create entry', error);
    }
  }

  async getDevlog(args: GetDevlogArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      const entry = await this.apiClient.getDevlog(args.id);
      return this.toStandardResponse(true, entry, `Retrieved entry ${args.id}`);
    } catch (error) {
      return this.handleError('Failed to get entry', error);
    }
  }

  async updateDevlog(args: UpdateDevlogArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      // First update the fields if provided
      if (
        args.status ||
        args.priority ||
        args.businessContext ||
        args.technicalContext ||
        args.acceptanceCriteria
      ) {
        await this.apiClient.updateDevlog(args.id, {
          status: args.status,
          priority: args.priority,
          businessContext: args.businessContext,
          technicalContext: args.technicalContext,
          acceptanceCriteria: args.acceptanceCriteria,
        });
      }

      // Handle update with optional note
      if (args.note) {
        await this.apiClient.addDevlogNote(args.id, args.note.content, args.note.category);
      }

      return this.toStandardResponse(true, { id: args.id }, `Updated entry ${args.id}`);
    } catch (error) {
      return this.handleError('Failed to update entry', error);
    }
  }

  async listDevlogs(args: ListDevlogArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      // Use list when no query
      const result = await this.apiClient.listDevlogs({
        status: args.status ? [args.status] : undefined,
        type: args.type ? [args.type] : undefined,
        priority: args.priority ? [args.priority] : undefined,
        page: args.page || 1,
        limit: args.limit || 10,
      });

      const entries = result.items.map((entry: any) => ({
        id: entry.id,
        status: entry.status,
        title: entry.title,
        type: entry.type,
        priority: entry.priority,
      }));

      return this.toStandardResponse(true, entries, `Found ${entries.length} entries`);
    } catch (error) {
      return this.handleError('Failed to list entries', error);
    }
  }

  async findRelatedDevlogs(args: FindRelatedDevlogsArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      const searchTerms = [args.description, ...(args.keywords || [])].join(' ');
      const result = await this.apiClient.searchDevlogs({
        query: searchTerms,
        type: args.type ? [args.type] : undefined,
        limit: args.limit,
      });

      const hasRelated = result.items.length > 0;
      const entries = result.items.slice(0, 10).map((entry) => ({
        id: entry.id,
        title: entry.title,
        type: entry.type,
        status: entry.status,
        priority: entry.priority,
      }));

      return this.toStandardResponse(
        true,
        {
          hasRelated,
          entries,
          count: result.items.length,
        },
        hasRelated
          ? `Found ${result.items.length} potentially related entries`
          : 'No related work found - safe to proceed',
      );
    } catch (error) {
      return this.handleError('Failed to find related entries', error);
    }
  }

  async addDevlogNote(args: AddDevlogNoteArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      await this.apiClient.addDevlogNote(args.id, args.content, args.category);

      return this.toStandardResponse(
        true,
        { id: args.id },
        `Added ${args.category} note to entry ${args.id}`,
      );
    } catch (error) {
      return this.handleError('Failed to add note', error);
    }
  }

  async listDevlogNotes(args: ListDevlogNotesArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      const result = await this.apiClient.listDevlogNotes(args.id, args.category, args.limit);

      return this.toStandardResponse(
        true,
        {
          devlogId: args.id,
          total: result.total,
          notes: result.notes,
        },
        `Found ${result.notes.length} notes for devlog ${args.id}`,
      );
    } catch (error) {
      return this.handleError('Failed to list notes', error);
    }
  }

  // === PROJECT OPERATIONS ===

  async listProjects(args: ListProjectsArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      const projects = await this.apiClient.listProjects();
      return this.toStandardResponse(
        true,
        projects,
        `Found ${projects.length} accessible projects`,
      );
    } catch (error) {
      return this.handleError('Failed to list projects', error);
    }
  }

  async getCurrentProject(args: GetCurrentProjectArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      const projects = await this.apiClient.listProjects();
      const current = projects.find((p: any) => p.id === this.currentProjectId);

      if (current) {
        return this.toStandardResponse(true, current, `Current project: ${current.name}`);
      } else {
        return this.toStandardResponse(false, undefined, undefined, 'No current project set');
      }
    } catch (error) {
      return this.handleError('Failed to get current project', error);
    }
  }

  async switchProject(args: SwitchProjectArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      const projectId = parseInt(args.projectId);

      // Validate project exists
      const projects = await this.apiClient.listProjects();
      const targetProject = projects.find((p: any) => p.id === projectId);

      if (!targetProject) {
        return this.toStandardResponse(
          false,
          undefined,
          undefined,
          `Project ${projectId} not found`,
        );
      }

      this.setCurrentProjectId(projectId);

      return this.toStandardResponse(
        true,
        { projectId },
        `Switched to project ${projectId}: ${targetProject.name}`,
      );
    } catch (error) {
      return this.handleError('Failed to switch project', error);
    }
  }

  // === DOCUMENT OPERATIONS ===

  async uploadDocument(args: UploadDocumentArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      // Decode base64 content
      const content = Buffer.from(args.content, 'base64');
      const size = content.length;

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024;
      if (size > maxSize) {
        return this.toStandardResponse(false, null, 'File size exceeds 10MB limit');
      }

      // Prepare form data for upload
      const formData = new FormData();
      const file = new Blob([content], { type: args.mimeType });
      formData.append('file', file, args.filename);
      
      if (args.metadata) {
        formData.append('metadata', JSON.stringify(args.metadata));
      }

      // Upload document via API client
      const result = await this.apiClient.uploadDocument(args.devlogId, formData);

      return this.toStandardResponse(
        true,
        result,
        `Document "${args.filename}" uploaded successfully to devlog ${args.devlogId}`,
      );
    } catch (error) {
      return this.handleError('Failed to upload document', error);
    }
  }

  async listDocuments(args: ListDocumentsArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      const documents = await this.apiClient.listDocuments(args.devlogId);

      // Apply limit if specified
      const limitedDocuments = args.limit ? documents.slice(0, args.limit) : documents;

      return this.toStandardResponse(
        true,
        { documents: limitedDocuments, total: documents.length },
        `Found ${documents.length} document(s) for devlog ${args.devlogId}`,
      );
    } catch (error) {
      return this.handleError('Failed to list documents', error);
    }
  }

  async getDocument(args: GetDocumentArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      // For getDocument, we need to find which devlog contains the document
      // This is a limitation of the current API design - we'll try a simple approach
      // by searching through recent devlogs
      const devlogs = await this.apiClient.listDevlogs({ 
        page: 1, 
        limit: 20,
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      });

      let document = null;
      for (const devlog of devlogs.items || []) {
        try {
          document = await this.apiClient.getDocument(devlog.id!, args.documentId);
          break;
        } catch (err) {
          // Document not found in this devlog, continue searching
          continue;
        }
      }

      if (!document) {
        return this.toStandardResponse(false, null, `Document ${args.documentId} not found`);
      }

      return this.toStandardResponse(
        true,
        document,
        `Retrieved document: ${document.originalName || args.documentId}`,
      );
    } catch (error) {
      return this.handleError('Failed to get document', error);
    }
  }

  async deleteDocument(args: DeleteDocumentArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      // Similar to getDocument, search through devlogs to find the document
      const devlogs = await this.apiClient.listDevlogs({ 
        page: 1, 
        limit: 20,
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      });

      let deleted = false;
      for (const devlog of devlogs.items || []) {
        try {
          await this.apiClient.deleteDocument(devlog.id!, args.documentId);
          deleted = true;
          break;
        } catch (err) {
          // Document not found in this devlog, continue searching
          continue;
        }
      }

      if (!deleted) {
        return this.toStandardResponse(false, null, `Document ${args.documentId} not found`);
      }

      return this.toStandardResponse(
        true,
        { documentId: args.documentId },
        `Document ${args.documentId} deleted successfully`,
      );
    } catch (error) {
      return this.handleError('Failed to delete document', error);
    }
  }

  async searchDocuments(args: SearchDocumentsArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      let documents: any[] = [];

      if (args.devlogId) {
        // Search within specific devlog
        const allDocuments = await this.apiClient.listDocuments(args.devlogId);
        
        // Filter documents by query
        documents = allDocuments.filter((doc: any) =>
          doc.originalName?.toLowerCase().includes(args.query.toLowerCase()) ||
          (doc.content && doc.content.toLowerCase().includes(args.query.toLowerCase())) ||
          doc.filename?.toLowerCase().includes(args.query.toLowerCase())
        );
      } else {
        // Search across all recent devlogs
        const devlogs = await this.apiClient.listDevlogs({ 
          page: 1, 
          limit: 10,
          sortBy: 'updatedAt',
          sortOrder: 'desc'
        });

        for (const devlog of devlogs.items || []) {
          try {
            const devlogDocuments = await this.apiClient.listDocuments(devlog.id!);
            
            const matchingDocs = devlogDocuments.filter((doc: any) =>
              doc.originalName?.toLowerCase().includes(args.query.toLowerCase()) ||
              (doc.content && doc.content.toLowerCase().includes(args.query.toLowerCase())) ||
              doc.filename?.toLowerCase().includes(args.query.toLowerCase())
            );

            documents.push(...matchingDocs);
          } catch (err) {
            // Continue with other devlogs if one fails
            console.warn(`Failed to search documents in devlog ${devlog.id}:`, err);
          }
        }
      }

      // Apply limit
      const limitedDocuments = args.limit ? documents.slice(0, args.limit) : documents;

      return this.toStandardResponse(
        true,
        { documents: limitedDocuments, total: documents.length },
        `Found ${documents.length} document(s) matching "${args.query}"`,
      );
    } catch (error) {
      return this.handleError('Failed to search documents', error);
    }
  }

  // === HELPER METHODS ===
}
