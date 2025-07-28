/**
 * MCP Adapter using HTTP API client
 * Simplified version that only uses devlog operations through the web API
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  DevlogApiClient,
  DevlogApiClientError,
  type DevlogApiClientConfig,
} from '../api/devlog-api-client.js';
import type {
  DevlogEntry,
  CreateDevlogRequest,
  UpdateDevlogRequest,
  DevlogFilter,
  PaginatedResult,
} from '@codervisor/devlog-core';
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
} from '../types/tool-args.js';

export interface MCPApiAdapterConfig {
  /** Configuration for the underlying API client */
  apiClient: DevlogApiClientConfig;
  /** Default project ID to use */
  defaultProjectId?: string;
  /** Whether to automatically detect web service URL */
  autoDiscoverWebService?: boolean;
}

/**
 * MCP Adapter that communicates through HTTP API instead of direct core access
 */
export class MCPApiAdapter {
  private apiClient: DevlogApiClient;
  private currentProjectId: string;
  private initialized = false;

  constructor(config: MCPApiAdapterConfig) {
    this.apiClient = new DevlogApiClient(config.apiClient);
    this.currentProjectId = config.defaultProjectId || 'default';

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
      // Test connection to the API
      await this.apiClient.healthCheck();
      console.log('✅ MCP API adapter initialized successfully');
      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize MCP API adapter:', error);
      throw new Error(
        `Failed to connect to devlog API: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get the current project ID
   */
  getCurrentProjectId(): string {
    return this.currentProjectId;
  }

  /**
   * Set the current project ID
   */
  setCurrentProjectId(projectId: string): void {
    this.currentProjectId = projectId;
    this.apiClient.setCurrentProject(projectId);
  }

  /**
   * Get the underlying API client (for project tools)
   */
  get manager(): DevlogApiClient {
    return this.apiClient;
  }

  // Devlog Operations
  async createDevlog(args: CreateDevlogArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      const entry = await this.apiClient.createDevlog(args as CreateDevlogRequest);

      return {
        content: [
          {
            type: 'text',
            text: `Created devlog entry: ${entry.id}\nTitle: ${entry.title}\nType: ${entry.type}\nPriority: ${entry.priority}\nStatus: ${entry.status}`,
          },
        ],
      };
    } catch (error) {
      return this.handleError('Failed to create devlog', error);
    }
  }

  async updateDevlog(args: UpdateDevlogArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      const entry = await this.apiClient.updateDevlog(args.id, args as UpdateDevlogRequest);

      return {
        content: [
          {
            type: 'text',
            text: `Updated devlog entry: ${entry.id}\nTitle: ${entry.title}\nStatus: ${entry.status}\nLast Updated: ${entry.updatedAt}`,
          },
        ],
      };
    } catch (error) {
      return this.handleError('Failed to update devlog', error);
    }
  }

  async getDevlog(args: GetContextForAIArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      const entry = await this.apiClient.getDevlog(args.id);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(entry, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(`Failed to get devlog ${args.id}`, error);
    }
  }

  async listDevlogs(args: ListDevlogsArgs = {}): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      const filter: DevlogFilter = {
        status: args.status ? [args.status] : undefined,
        type: args.type ? [args.type] : undefined,
        priority: args.priority ? [args.priority] : undefined,
        archived: args.archived,
        pagination:
          args.page || args.limit || args.sortBy
            ? {
                page: args.page,
                limit: args.limit,
                sortBy: args.sortBy,
                sortOrder: args.sortOrder,
              }
            : undefined,
      };

      const result = await this.apiClient.listDevlogs(filter);
      const entries = result.items;

      if (entries.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No devlog entries found matching the criteria.',
            },
          ],
        };
      }

      const summary = entries
        .map(
          (entry: DevlogEntry) =>
            `- [${entry.status}] ${entry.title} (${entry.type}, ${entry.priority}) - ${entry.id}`,
        )
        .join('\n');

      let resultText = `Found ${entries.length} devlog entries`;
      if (result.pagination) {
        resultText += ` (page ${result.pagination.page} of ${result.pagination.totalPages}, ${result.pagination.total} total)`;
      }
      resultText += `:\n\n${summary}`;

      return {
        content: [
          {
            type: 'text',
            text: resultText,
          },
        ],
      };
    } catch (error) {
      return this.handleError('Failed to list devlogs', error);
    }
  }

  async searchDevlogs(args: SearchDevlogsArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      const filter: DevlogFilter = {
        status: args.status ? [args.status] : undefined,
        type: args.type ? [args.type] : undefined,
        priority: args.priority ? [args.priority] : undefined,
        archived: args.archived,
      };

      const result = await this.apiClient.searchDevlogs(args.query, filter);
      const entries = result.items;

      if (entries.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No devlog entries found matching query: "${args.query}"`,
            },
          ],
        };
      }

      const summary = entries
        .map(
          (entry: DevlogEntry) =>
            `- [${entry.status}] ${entry.title} (${entry.type}, ${entry.priority}) - ${entry.id}`,
        )
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Found ${entries.length} devlog entries matching "${args.query}":\n\n${summary}`,
          },
        ],
      };
    } catch (error) {
      return this.handleError('Failed to search devlogs', error);
    }
  }

  async addDevlogNote(args: AddDevlogNoteArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      const entry = await this.apiClient.addDevlogNote(
        args.id,
        args.note,
        args.category,
        args.files,
        args.codeChanges,
      );

      return {
        content: [
          {
            type: 'text',
            text: `Added ${args.category || 'progress'} note to devlog '${entry.id}':\n${args.note}\n\nTotal notes: ${entry.notes?.length || 0}`,
          },
        ],
      };
    } catch (error) {
      return this.handleError('Failed to add devlog note', error);
    }
  }

  async updateDevlogWithNote(args: UpdateDevlogWithNoteArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      // First update the devlog fields if provided
      if (args.status || args.priority) {
        await this.apiClient.updateDevlog(args.id, {
          status: args.status,
          priority: args.priority,
        } as UpdateDevlogRequest);
      }

      // Then add the note
      const entry = await this.apiClient.addDevlogNote(
        args.id,
        args.note,
        args.category,
        args.files,
        args.codeChanges,
      );

      return {
        content: [
          {
            type: 'text',
            text: `Updated devlog '${entry.id}' and added ${args.category || 'progress'} note:\n${args.note}\n\nStatus: ${entry.status}\nTotal notes: ${entry.notes?.length || 0}`,
          },
        ],
      };
    } catch (error) {
      return this.handleError('Failed to update devlog with note', error);
    }
  }

  async completeDevlog(args: CompleteDevlogArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      // Update status to done
      const entry = await this.apiClient.updateDevlog(args.id, {
        status: 'done',
        closedAt: new Date().toISOString(),
      } as any);

      // Add completion note if provided
      if (args.summary) {
        await this.apiClient.addDevlogNote(args.id, `Completed: ${args.summary}`, 'progress');
      }

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
      return this.handleError('Failed to complete devlog', error);
    }
  }

  async closeDevlog(args: CloseDevlogArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      // Update status to cancelled
      const entry = await this.apiClient.updateDevlog(args.id, {
        status: 'cancelled',
        closedAt: new Date().toISOString(),
      } as any);

      // Add closure note if provided
      if (args.reason) {
        await this.apiClient.addDevlogNote(args.id, `Closed: ${args.reason}`, 'feedback');
      }

      return {
        content: [
          {
            type: 'text',
            text: `Closed devlog '${entry.id}': ${entry.title}\nStatus: ${entry.status}\nReason: ${args.reason || 'None provided'}`,
          },
        ],
      };
    } catch (error) {
      return this.handleError('Failed to close devlog', error);
    }
  }

  async archiveDevlog(args: { id: number }): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      const entry = await this.apiClient.archiveDevlog(args.id);

      return {
        content: [
          {
            type: 'text',
            text: `Archived devlog '${entry.id}': ${entry.title}`,
          },
        ],
      };
    } catch (error) {
      return this.handleError('Failed to archive devlog', error);
    }
  }

  async unarchiveDevlog(args: { id: number }): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      const entry = await this.apiClient.unarchiveDevlog(args.id);

      return {
        content: [
          {
            type: 'text',
            text: `Unarchived devlog '${entry.id}': ${entry.title}`,
          },
        ],
      };
    } catch (error) {
      return this.handleError('Failed to unarchive devlog', error);
    }
  }

  async getActiveContext(args: GetActiveContextArgs = {}): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      const filter: DevlogFilter = {
        status: ['new', 'in-progress', 'blocked', 'in-review', 'testing'],
        pagination: args.limit ? { limit: args.limit } : undefined,
      };

      const result = await this.apiClient.listDevlogs(filter);
      const entries = result.items;
      const limited = entries.slice(0, args.limit || 10);

      if (limited.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No active devlog entries found.',
            },
          ],
        };
      }

      const summary = limited
        .map((entry: DevlogEntry) => {
          const recentNotes = entry.notes?.slice(-2) || [];
          const notesText =
            recentNotes.length > 0
              ? `\n  Recent notes: ${recentNotes.map((n: any) => n.content).join('; ')}`
              : '';

          return `- [${entry.status}] ${entry.title} (${entry.type}, ${entry.priority})${notesText}`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `${limited.length} active devlog entries:\n\n${summary}`,
          },
        ],
      };
    } catch (error) {
      return this.handleError('Failed to get active context', error);
    }
  }

  async getContextForAI(args: GetContextForAIArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      const entry = await this.apiClient.getDevlog(args.id);

      const context = {
        id: entry.id,
        title: entry.title,
        type: entry.type,
        status: entry.status,
        priority: entry.priority,
        description: entry.description,
        businessContext: entry.businessContext,
        technicalContext: entry.technicalContext,
        acceptanceCriteria: entry.acceptanceCriteria,
        recentNotes: entry.notes?.slice(-5) || [],
        totalNotes: entry.notes?.length || 0,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(context, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError('Failed to get context for AI', error);
    }
  }

  async updateAIContext(args: UpdateAIContextArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      // For now, we'll add AI context updates as structured notes
      const aiContextNote = Object.entries({
        summary: args.summary,
        insights: args.insights,
        nextSteps: args.nextSteps,
        questions: args.questions,
        patterns: args.patterns,
      })
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `**${key}**: ${Array.isArray(value) ? value.join(', ') : value}`)
        .join('\n\n');

      if (aiContextNote) {
        await this.apiClient.addDevlogNote(
          args.id,
          `**AI Context Update**\n\n${aiContextNote}`,
          'idea',
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: `Updated AI context for devlog '${args.id}'`,
          },
        ],
      };
    } catch (error) {
      return this.handleError('Failed to update AI context', error);
    }
  }

  async discoverRelatedDevlogs(args: DiscoverRelatedDevlogsArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    try {
      // Use search to find potentially related entries
      const searchTerms = [args.workDescription, ...(args.keywords || []), args.scope || '']
        .filter(Boolean)
        .join(' ');

      const result = await this.apiClient.searchDevlogs(searchTerms);
      const entries = result.items;

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
        .map((entry: DevlogEntry) => {
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
            `${statusEmoji[entry.status] || '📄'} **${entry.title}** (${entry.type})\n` +
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
              `**Found ${entries.length} potentially related entries:**\n\n${analysis}\n\n` +
              `⚠️ RECOMMENDATION: Review related entries before creating new work to avoid duplication.`,
          },
        ],
      };
    } catch (error) {
      return this.handleError('Failed to discover related devlogs', error);
    }
  }

  // Stub implementations for unsupported operations
  async addDecision(args: AddDecisionArgs): Promise<CallToolResult> {
    return {
      content: [
        {
          type: 'text',
          text: `Decision tracking has been simplified and is no longer supported. Use notes with category 'idea' or 'solution' instead.`,
        },
      ],
      isError: true,
    };
  }

  async dispose(): Promise<void> {
    this.initialized = false;
  }

  // Helper methods
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private handleError(message: string, error: unknown): CallToolResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${message}:`, errorMessage);

    return {
      content: [
        {
          type: 'text',
          text: `${message}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
