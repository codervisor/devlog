/**
 * MCP Adapter using HTTP API client instead of direct core access
 * This implements the new architecture where MCP communicates through web API
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  DevlogApiClient,
  DevlogApiClientError,
  type DevlogApiClientConfig,
} from '../api/devlog-api-client.js';
import type {
  DevlogEntry,
  WorkspaceMetadata,
  WorkspaceContext,
  CreateDevlogRequest,
  UpdateDevlogRequest,
  DevlogFilter,
  PaginatedResult,
} from '@devlog/core';
import type {
  CreateDevlogArgs,
  UpdateDevlogArgs,
  ListDevlogsArgs,
  SearchDevlogsArgs,
  AddDevlogNoteArgs,
  UpdateDevlogWithNoteArgs,
  AddDecisionArgs,
  CompleteDevlogArgs,
  CloseDevlogArgs,
  GetActiveContextArgs,
  GetContextForAIArgs,
  DiscoverRelatedDevlogsArgs,
  UpdateAIContextArgs,
} from '../types/index.js';

export interface MCPApiAdapterConfig {
  /** Configuration for the underlying API client */
  apiClient: DevlogApiClientConfig;
  /** Default workspace ID to use */
  defaultWorkspaceId?: string;
  /** Whether to automatically detect web service URL */
  autoDiscoverWebService?: boolean;
}

/**
 * MCP Adapter that communicates through HTTP API instead of direct core access
 * This maintains the same interface as the original MCPDevlogAdapter but uses HTTP
 */
export class MCPApiAdapter {
  private apiClient: DevlogApiClient;
  private initialized = false;
  private currentWorkspaceId: string | null = null;

  constructor(config: MCPApiAdapterConfig) {
    this.apiClient = new DevlogApiClient(config.apiClient);
    this.currentWorkspaceId = config.defaultWorkspaceId || 'default';

    if (this.currentWorkspaceId) {
      this.apiClient.setCurrentWorkspace(this.currentWorkspaceId);
    }
  }

  /**
   * Initialize the adapter and test connection
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Test connection to the web API
      const connectionOk = await this.apiClient.testConnection();
      if (!connectionOk) {
        throw new Error('Failed to connect to devlog web API');
      }

      // If we have a default workspace, verify it exists
      if (this.currentWorkspaceId) {
        try {
          await this.apiClient.switchToWorkspace(this.currentWorkspaceId);
        } catch (error) {
          console.warn(`Default workspace '${this.currentWorkspaceId}' not available:`, error);
          // Continue without workspace - tools will handle this
          this.currentWorkspaceId = null;
        }
      }

      this.initialized = true;
      console.log('MCP API Adapter initialized successfully');
    } catch (error) {
      throw new Error(
        `Failed to initialize MCP API Adapter: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    this.initialized = false;
    // API client doesn't have persistent connections to clean up
  }

  /**
   * Get the current workspace ID (in-memory only)
   */
  getCurrentWorkspaceId(): string | null {
    return this.currentWorkspaceId;
  }

  /**
   * Set the current workspace ID (in-memory only)
   */
  setCurrentWorkspaceId(workspaceId: string): void {
    this.currentWorkspaceId = workspaceId;
    this.apiClient.setCurrentWorkspace(workspaceId);
  }

  /**
   * Convert API client errors to MCP-compatible format
   */
  private handleApiError(error: unknown, operation: string): never {
    if (error instanceof DevlogApiClientError) {
      throw new Error(`${operation} failed: ${error.message}`);
    }

    let message: string;
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else {
      message = 'Unknown error';
    }

    throw new Error(`${operation} failed: ${message}`);
  }

  // === Tool Implementation Methods ===

  /**
   * Create a new devlog entry
   */
  async createDevlog(args: CreateDevlogArgs): Promise<CallToolResult> {
    try {
      this.ensureInitialized();

      // Convert MCP args to API request format
      const request: CreateDevlogRequest = {
        title: args.title,
        type: args.type,
        description: args.description,
        priority: args.priority,
        businessContext: args.businessContext,
        technicalContext: args.technicalContext,
        acceptanceCriteria: args.acceptanceCriteria,
        initialInsights: args.initialInsights,
        relatedPatterns: args.relatedPatterns,
      };

      const entry = await this.apiClient.createDevlog(request);

      return {
        content: [
          {
            type: 'text',
            text: `Created devlog entry: ${entry.id}\nTitle: ${entry.title}\nType: ${entry.type}\nStatus: ${entry.status}\nPriority: ${entry.priority}`,
          },
        ],
      };
    } catch (error) {
      this.handleApiError(error, 'Create devlog');
    }
  }

  /**
   * Update an existing devlog entry
   */
  async updateDevlog(args: UpdateDevlogArgs): Promise<CallToolResult> {
    try {
      this.ensureInitialized();

      // Convert MCP args to API request format, filtering out undefined values
      const updateData: UpdateDevlogRequest = {
        id: args.id,
        ...(args.status !== undefined && { status: args.status }),
        ...(args.priority !== undefined && { priority: args.priority }),
        ...(args.blockers !== undefined && { blockers: args.blockers }),
        ...(args.nextSteps !== undefined && { nextSteps: args.nextSteps }),
        ...(args.files !== undefined && { files: args.files }),
        ...(args.businessContext !== undefined && { businessContext: args.businessContext }),
        ...(args.technicalContext !== undefined && { technicalContext: args.technicalContext }),
        ...(args.acceptanceCriteria !== undefined && {
          acceptanceCriteria: args.acceptanceCriteria,
        }),
        ...(args.initialInsights !== undefined && { initialInsights: args.initialInsights }),
        ...(args.relatedPatterns !== undefined && { relatedPatterns: args.relatedPatterns }),
        ...(args.currentSummary !== undefined && { currentSummary: args.currentSummary }),
        ...(args.keyInsights !== undefined && { keyInsights: args.keyInsights }),
        ...(args.openQuestions !== undefined && { openQuestions: args.openQuestions }),
        ...(args.suggestedNextSteps !== undefined && {
          suggestedNextSteps: args.suggestedNextSteps,
        }),
      };

      const entry = await this.apiClient.updateDevlog(args.id, updateData);

      return {
        content: [
          {
            type: 'text',
            text: `Updated devlog entry: ${entry.id}\nTitle: ${entry.title}\nStatus: ${entry.status}\nLast updated: ${entry.updatedAt}`,
          },
        ],
      };
    } catch (error) {
      this.handleApiError(error, 'Update devlog');
    }
  }

  /**
   * Get a devlog entry by ID
   */
  async getDevlog(args: GetContextForAIArgs): Promise<CallToolResult> {
    try {
      this.ensureInitialized();

      const entry = await this.apiClient.getDevlog(args.id);

      if (!entry) {
        return {
          content: [
            {
              type: 'text',
              text: `Devlog entry ${args.id} not found`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(entry, null, 2),
          },
        ],
      };
    } catch (error) {
      this.handleApiError(error, 'Get devlog');
    }
  }

  /**
   * List devlog entries with optional filtering - supports both direct filter and args object
   */
  async listDevlogs(args: ListDevlogsArgs = {}): Promise<CallToolResult> {
    try {
      this.ensureInitialized();

      // Convert MCP args to API filter format, filtering out undefined values
      const filter: DevlogFilter = {
        ...(args.status && { status: [args.status] }),
        ...(args.type && { type: [args.type] }),
        ...(args.priority && { priority: [args.priority] }),
        ...(args.archived !== undefined && { archived: args.archived }),
        ...(args.page || args.limit || args.sortBy
          ? {
              pagination: {
                ...(args.page !== undefined && { page: args.page }),
                ...(args.limit !== undefined && { limit: args.limit }),
                ...(args.sortBy !== undefined && { sortBy: args.sortBy }),
                sortOrder: args.sortOrder || 'desc',
              },
            }
          : {}),
      };

      const result = await this.apiClient.listDevlogs(filter);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      this.handleApiError(error, 'List devlogs');
    }
  }

  /**
   * Search devlog entries - supports both separate args and args object
   */
  async searchDevlogs(args: SearchDevlogsArgs): Promise<CallToolResult> {
    try {
      this.ensureInitialized();

      // Convert MCP args to API call format
      const searchFilter: DevlogFilter = {
        status: args.status ? [args.status] : undefined,
        type: args.type ? [args.type] : undefined,
        priority: args.priority ? [args.priority] : undefined,
        archived: args.archived,
      };

      const result = await this.apiClient.searchDevlogs(args.query, searchFilter);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      this.handleApiError(error, 'Search devlogs');
    }
  }

  /**
   * Archive (soft delete) a devlog entry - supports both direct ID and args object
   */
  async archiveDevlog(
    idOrArgs: string | number | { id: string | number },
  ): Promise<CallToolResult> {
    try {
      this.ensureInitialized();

      const id = typeof idOrArgs === 'object' ? idOrArgs.id : idOrArgs;
      await this.apiClient.archiveDevlog(id);

      return {
        content: [
          {
            type: 'text',
            text: `Archived devlog entry: ${id}`,
          },
        ],
      };
    } catch (error) {
      this.handleApiError(error, 'Archive devlog');
    }
  }

  // === Workspace Operations ===

  /**
   * List all available workspaces
   */
  async listWorkspaces(): Promise<CallToolResult> {
    try {
      this.ensureInitialized();

      const result = await this.apiClient.listWorkspaces();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      this.handleApiError(error, 'List workspaces');
    }
  }

  /**
   * Get current workspace context
   */
  async getCurrentWorkspace(): Promise<CallToolResult> {
    try {
      this.ensureInitialized();

      const workspace = await this.apiClient.getCurrentWorkspace();

      return {
        content: [
          {
            type: 'text',
            text: workspace ? JSON.stringify(workspace, null, 2) : 'No current workspace',
          },
        ],
      };
    } catch (error) {
      this.handleApiError(error, 'Get current workspace');
    }
  }

  /**
   * Switch to a different workspace (client-side only)
   */
  async switchToWorkspace(workspaceId: string): Promise<CallToolResult> {
    try {
      this.ensureInitialized();

      // First verify the workspace exists
      const workspaceResult = await this.listWorkspaces();
      const workspaces = JSON.parse(workspaceResult.content[0].text as string);
      const targetWorkspace = workspaces.workspaces.find((ws: any) => ws.id === workspaceId);

      if (!targetWorkspace) {
        return {
          content: [
            {
              type: 'text',
              text: `Workspace '${workspaceId}' not found. Available workspaces: ${workspaces.workspaces.map((ws: any) => ws.id).join(', ')}`,
            },
          ],
          isError: true,
        };
      }

      // Switch workspace client-side only
      this.apiClient.switchToWorkspace(workspaceId);
      this.currentWorkspaceId = workspaceId;

      return {
        content: [
          {
            type: 'text',
            text: `Switched to workspace: ${workspaceId}\nName: ${targetWorkspace.name}\nDescription: ${targetWorkspace.description || 'No description'}`,
          },
        ],
      };
    } catch (error) {
      this.handleApiError(error, 'Switch workspace');
    }
  }

  /**
   * Create a new workspace
   */
  async createWorkspace(
    workspace: Omit<WorkspaceMetadata, 'createdAt' | 'lastAccessedAt'>,
    storage: any,
  ): Promise<CallToolResult> {
    try {
      this.ensureInitialized();

      const created = await this.apiClient.createWorkspace(workspace, storage);

      return {
        content: [
          {
            type: 'text',
            text: `Created workspace: ${created.id}\n${JSON.stringify(created, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      this.handleApiError(error, 'Create workspace');
    }
  }

  // === Batch Operations ===

  /**
   * Add note to a devlog entry - supports both separate args and args object
   */
  async addDevlogNote(args: AddDevlogNoteArgs): Promise<CallToolResult> {
    try {
      this.ensureInitialized();

      const result = await this.apiClient.batchAddNotes([
        {
          id: args.id,
          note: args.note,
          category: args.category || 'progress',
          codeChanges: args.codeChanges,
          files: args.files,
        },
      ]);

      const entry = result[0];

      return {
        content: [
          {
            type: 'text',
            text: `Added note to devlog ${entry?.id}:\n"${args.note}"\nTotal notes: ${entry?.notes?.length || 0}`,
          },
        ],
      };
    } catch (error) {
      this.handleApiError(error, 'Add devlog note');
    }
  }

  // === Missing Methods from Original Adapter ===

  /**
   * Unarchive a devlog entry
   */
  async unarchiveDevlog(args: { id: number }): Promise<CallToolResult> {
    try {
      this.ensureInitialized();

      // Note: The web API doesn't have a direct unarchive endpoint
      // We'll need to update the devlog to set archived: false
      const entry = await this.apiClient.updateDevlog(args.id, {
        id: args.id,
        archived: false,
      } as UpdateDevlogRequest);

      if (!entry) {
        throw new Error(`Devlog entry ${args.id} not found`);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Unarchived devlog '${entry.id}': ${entry.title}`,
          },
        ],
      };
    } catch (error) {
      this.handleApiError(error, 'Unarchive devlog');
    }
  }

  /**
   * Update devlog with note in one operation
   */
  async updateDevlogWithNote(args: UpdateDevlogWithNoteArgs): Promise<CallToolResult> {
    try {
      this.ensureInitialized();

      // First update the devlog fields
      const updates: any = {};
      if (args.status) updates.status = args.status;
      if (args.priority) updates.priority = args.priority;

      if (Object.keys(updates).length > 0) {
        await this.apiClient.updateDevlog(args.id, updates);
      }

      // Then add the note
      const result = await this.apiClient.batchAddNotes([
        {
          id: args.id,
          note: args.note,
          category: args.category || 'progress',
          codeChanges: args.codeChanges,
          files: args.files,
        },
      ]);

      const entry = result[0];

      return {
        content: [
          {
            type: 'text',
            text: `Updated devlog '${entry.id}' and added ${args.category || 'progress'} note:\n${args.note}\n\nStatus: ${entry.status}\nTotal notes: ${entry.notes.length}`,
          },
        ],
      };
    } catch (error) {
      this.handleApiError(error, 'Update devlog with note');
    }
  }

  /**
   * Add a decision to a devlog entry
   */
  async addDecision(args: AddDecisionArgs): Promise<CallToolResult> {
    try {
      this.ensureInitialized();

      // Get the current devlog to update its decisions
      const currentEntry = await this.apiClient.getDevlog(args.id);
      if (!currentEntry) {
        throw new Error(`Devlog entry '${args.id}' not found`);
      }

      const decision = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        decision: args.decision,
        rationale: args.rationale,
        alternatives: args.alternatives || [],
        decisionMaker: args.decisionMaker,
      };

      // Update the devlog with the new decision
      const decisions = [...(currentEntry.context?.decisions || []), decision];
      const updatedEntry = await this.apiClient.updateDevlog(args.id, {
        id: args.id,
        // Note: context updates might not be supported directly
        // We'll add the decision as a note instead
      } as UpdateDevlogRequest);

      // Add the decision as a structured note
      await this.apiClient.batchAddNotes([
        {
          id: args.id,
          note: `**Decision Made**: ${args.decision}\n\n**Rationale**: ${args.rationale}\n\n**Decision Maker**: ${args.decisionMaker}${args.alternatives ? `\n\n**Alternatives Considered**: ${args.alternatives.join(', ')}` : ''}`,
          category: 'solution',
        },
      ]);

      return {
        content: [
          {
            type: 'text',
            text: `Added decision to devlog '${args.id}':\nDecision: ${args.decision}\nRationale: ${args.rationale}\nDecision Maker: ${args.decisionMaker}`,
          },
        ],
      };
    } catch (error) {
      this.handleApiError(error, 'Add decision');
    }
  }

  /**
   * Complete a devlog entry
   */
  async completeDevlog(args: CompleteDevlogArgs): Promise<CallToolResult> {
    try {
      this.ensureInitialized();

      const updates: any = { status: 'done' };
      if (args.summary) {
        // Add completion summary as a note
        await this.apiClient.batchAddNotes([
          {
            id: args.id,
            note: `Completion Summary: ${args.summary}`,
            category: 'solution',
          },
        ]);
      }

      const entry = await this.apiClient.updateDevlog(args.id, updates);

      return {
        content: [
          {
            type: 'text',
            text: `Completed devlog '${entry.title}' (ID: ${entry.id})${
              args.summary ? ` with summary: ${args.summary}` : ''
            }`,
          },
        ],
      };
    } catch (error) {
      this.handleApiError(error, 'Complete devlog');
    }
  }

  /**
   * Close a devlog entry (set to cancelled)
   */
  async closeDevlog(args: CloseDevlogArgs): Promise<CallToolResult> {
    try {
      this.ensureInitialized();

      const updates: any = { status: 'cancelled' };
      if (args.reason) {
        // Add closure reason as a note
        await this.apiClient.batchAddNotes([
          {
            id: args.id,
            note: `Closure Reason: ${args.reason}`,
            category: 'feedback',
          },
        ]);
      }

      const entry = await this.apiClient.updateDevlog(args.id, updates);

      return {
        content: [
          {
            type: 'text',
            text: `Closed devlog '${entry.id}': ${entry.title}\nStatus: ${entry.status}\nReason: ${args.reason || 'None provided'}`,
          },
        ],
      };
    } catch (error) {
      this.handleApiError(error, 'Close devlog');
    }
  }

  /**
   * Get active context - list of active devlog entries
   */
  async getActiveContext(args: GetActiveContextArgs = {}): Promise<CallToolResult> {
    try {
      this.ensureInitialized();

      const filter = {
        status: ['new', 'in-progress', 'blocked', 'in-review', 'testing'] as any[],
        pagination: {
          limit: args.limit || 10,
        },
      };

      const result = await this.apiClient.listDevlogs(filter);

      if (!result || !result.items) {
        return {
          content: [
            {
              type: 'text',
              text: 'No active devlog entries found.',
            },
          ],
        };
      }

      const entries = result.items;

      if (entries.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No active devlog entries found.',
            },
          ],
        };
      }

      const summary = entries
        .map((entry) => {
          const recentNotes = entry.notes?.slice(-2) || [];
          const notesText =
            recentNotes.length > 0
              ? `\n  Recent notes: ${recentNotes.map((n) => n.content).join('; ')}`
              : '';
          return `- [${entry.status}] ${entry.title} (${entry.type}, ${entry.priority})${notesText}`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `${entries.length} active devlog entries:\n\n${summary}`,
          },
        ],
      };
    } catch (error) {
      this.handleApiError(error, 'Get active context');
    }
  }

  /**
   * Get context for AI - detailed devlog information
   */
  async getContextForAI(args: GetContextForAIArgs): Promise<CallToolResult> {
    // For now, just delegate to getDevlog since the API client returns full detail
    return this.getDevlog(args);
  }

  /**
   * Update AI context for a devlog entry
   */
  async updateAIContext(args: UpdateAIContextArgs): Promise<CallToolResult> {
    try {
      this.ensureInitialized();

      const updates: any = {};
      if (args.summary) updates.currentSummary = args.summary;
      if (args.insights) updates.keyInsights = args.insights;
      if (args.patterns) updates.relatedPatterns = args.patterns;
      if (args.questions) updates.openQuestions = args.questions;
      if (args.nextSteps) updates.suggestedNextSteps = args.nextSteps;

      // Note: AI context updates might not be directly supported
      // We'll add the AI context as a structured note instead
      const aiContextNote = Object.entries(updates)
        .map(([key, value]) => `**${key}**: ${Array.isArray(value) ? value.join(', ') : value}`)
        .join('\n\n');

      if (aiContextNote) {
        await this.apiClient.batchAddNotes([
          {
            id: args.id,
            note: `**AI Context Update**\n\n${aiContextNote}`,
            category: 'idea',
          },
        ]);
      }

      const entry = await this.apiClient.getDevlog(args.id);

      if (!entry) {
        throw new Error(`Devlog entry '${args.id}' not found`);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Updated AI context for devlog '${entry.title}' (ID: ${entry.id})`,
          },
        ],
      };
    } catch (error) {
      this.handleApiError(error, 'Update AI context');
    }
  }

  /**
   * Discover related devlog entries
   */
  async discoverRelatedDevlogs(args: DiscoverRelatedDevlogsArgs): Promise<CallToolResult> {
    try {
      this.ensureInitialized();

      // Use search to find potentially related entries
      const searchTerms = [args.workDescription, ...(args.keywords || []), args.scope || '']
        .filter(Boolean)
        .join(' ');

      const searchResult = await this.apiClient.searchDevlogs(searchTerms);

      if (!searchResult || !searchResult.items) {
        return {
          content: [
            {
              type: 'text',
              text: `No related devlog entries found for:\nWork: ${args.workDescription}\nType: ${args.workType}\n\n✅ Safe to create a new devlog entry - no overlapping work detected.`,
            },
          ],
        };
      }

      const entries = searchResult.items;

      if (entries.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No related devlog entries found for:\nWork: ${args.workDescription}\nType: ${args.workType}\n\n✅ Safe to create a new devlog entry - no overlapping work detected.`,
            },
          ],
        };
      }

      const analysis = entries
        .slice(0, 10)
        .map((entry) => {
          const statusEmoji: Record<string, string> = {
            new: '🆕',
            'in-progress': '🔄',
            blocked: '🚫',
            'in-review': '👀',
            testing: '🧪',
            done: '✅',
            cancelled: '📦',
          };

          return (
            `${statusEmoji[entry.status] || '📝'} **${entry.title}** (${entry.type})\n` +
            `   ID: ${entry.id}\n` +
            `   Status: ${entry.status} | Priority: ${entry.priority}\n` +
            `   Description: ${entry.description.substring(0, 150)}${entry.description.length > 150 ? '...' : ''}\n` +
            `   Last Updated: ${new Date(entry.updatedAt).toLocaleDateString()}\n`
          );
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text:
              `## Discovery Analysis for: "${args.workDescription}"\n\n` +
              `**Search Parameters:**\n` +
              `- Type: ${args.workType}\n` +
              `- Keywords: ${args.keywords?.join(', ') || 'None'}\n` +
              `- Scope: ${args.scope || 'Not specified'}\n\n` +
              `**Found ${entries.length} related entries:**\n\n${analysis}\n\n` +
              `⚠️ RECOMMENDATION: Review related entries before creating new work to avoid duplication.`,
          },
        ],
      };
    } catch (error) {
      this.handleApiError(error, 'Discover related devlogs');
    }
  }

  /**
   * Get the manager property for compatibility (returns this for API client)
   */
  get manager(): any {
    return {
      // Provide minimal compatibility interface
      listWorkspaces: () => this.listWorkspaces(),
      getCurrentWorkspace: () => this.getCurrentWorkspace(),
      switchToWorkspace: (id: string) => this.switchToWorkspace(id),
    };
  }

  /**
   * Get workspace statistics
   */
  async getWorkspaceStats(): Promise<CallToolResult> {
    try {
      this.ensureInitialized();

      const stats = await this.apiClient.getWorkspaceStats();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(stats, null, 2),
          },
        ],
      };
    } catch (error) {
      this.handleApiError(error, 'Get workspace stats');
    }
  }

  // === Utility Methods ===

  /**
   * Ensure adapter is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('MCP API Adapter not initialized. Call initialize() first.');
    }
  }

  /**
   * Test connection to the web API
   */
  async testConnection(): Promise<CallToolResult> {
    try {
      const isConnected = await this.apiClient.testConnection();

      return {
        content: [
          {
            type: 'text',
            text: `API connection: ${isConnected ? 'Connected' : 'Failed'}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
}
