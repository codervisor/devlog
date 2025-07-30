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
import type {
  CreateDevlogArgs,
  GetDevlogArgs,
  UpdateDevlogArgs,
  ListDevlogArgs,
  AddNoteArgs,
  CompleteDevlogArgs,
  FindRelatedArgs,
  ListProjectsArgs,
  GetCurrentProjectArgs,
  SwitchProjectArgs,
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
      console.log('✅ MCP adapter initialized successfully');
      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize MCP adapter:', error);
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
    console.error(`${operation}:`, errorMessage);

    return this.toStandardResponse(false, undefined, undefined, `${operation}: ${errorMessage}`);
  }

  // === DEVLOG OPERATIONS ===

  async create(args: CreateDevlogArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      const entry = await this.apiClient.createDevlog({
        title: args.title,
        type: args.type,
        description: args.description,
        priority: args.priority,
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

  async get(args: GetDevlogArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      const entry = await this.apiClient.getDevlog(args.id);
      return this.toStandardResponse(true, entry, `Retrieved entry ${args.id}`);
    } catch (error) {
      return this.handleError('Failed to get entry', error);
    }
  }

  async update(args: UpdateDevlogArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      // Handle update with optional note
      if (args.note) {
        // First update the fields if provided
        if (args.status || args.priority) {
          await this.apiClient.updateDevlog(args.id, {
            status: args.status,
            priority: args.priority,
          });
        }

        // Then add the note
        await this.apiClient.addDevlogNote(args.id, args.note, 'progress', args.files);

        return this.toStandardResponse(true, { id: args.id }, `Updated entry ${args.id} with note`);
      } else {
        // Regular update without note
        const entry = await this.apiClient.updateDevlog(args.id, {
          status: args.status,
          priority: args.priority,
        });

        return this.toStandardResponse(true, { id: args.id }, `Updated entry ${args.id}`);
      }
    } catch (error) {
      return this.handleError('Failed to update entry', error);
    }
  }

  async list(args: ListDevlogArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      let result;

      if (args.query) {
        // Use search when query is provided
        result = await this.apiClient.searchDevlogs(args.query, {
          status: args.status ? [args.status] : undefined,
          type: args.type ? [args.type] : undefined,
          priority: args.priority ? [args.priority] : undefined,
        });
      } else {
        // Use list when no query
        result = await this.apiClient.listDevlogs({
          status: args.status ? [args.status] : undefined,
          type: args.type ? [args.type] : undefined,
          priority: args.priority ? [args.priority] : undefined,
          pagination: args.limit ? { limit: args.limit } : undefined,
        });
      }

      const entries = result.items.map((entry: any) => ({
        id: entry.id,
        status: entry.status,
        title: entry.title,
        type: entry.type,
        priority: entry.priority,
      }));

      return this.toStandardResponse(
        true,
        entries,
        `Found ${entries.length} entries${args.query ? ` matching "${args.query}"` : ''}`,
      );
    } catch (error) {
      return this.handleError('Failed to list entries', error);
    }
  }

  async addNote(args: AddNoteArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      await this.apiClient.addDevlogNote(args.id, args.note, args.category, args.files);

      return this.toStandardResponse(
        true,
        { id: args.id },
        `Added ${args.category} note to entry ${args.id}`,
      );
    } catch (error) {
      return this.handleError('Failed to add note', error);
    }
  }

  async complete(args: CompleteDevlogArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      await this.apiClient.updateDevlog(args.id, { status: 'done' });

      if (args.summary) {
        await this.apiClient.addDevlogNote(args.id, `Completed: ${args.summary}`, 'progress');
      }

      return this.toStandardResponse(
        true,
        { id: args.id, status: 'done' },
        `Completed entry ${args.id}${args.summary ? ` - ${args.summary}` : ''}`,
      );
    } catch (error) {
      return this.handleError('Failed to complete entry', error);
    }
  }

  async findRelated(args: FindRelatedArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      const searchTerms = [args.description, ...(args.keywords || [])].join(' ');
      const result = await this.apiClient.searchDevlogs(searchTerms);

      const hasRelated = result.items.length > 0;
      const entries = result.items.slice(0, 10).map((entry: any) => ({
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
}
