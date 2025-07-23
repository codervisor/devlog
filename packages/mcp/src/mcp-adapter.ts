/**
 * MCP adapter that uses the flexible storage architecture
 */

import * as crypto from 'crypto';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  AIContext,
  CreateDevlogRequest,
  DevlogConfig,
  DevlogContext,
  DevlogEntry,
  DevlogStatus,
  DiscoveredDevlogEntry,
  NoteCategory,
  UpdateDevlogRequest,
  WorkspaceDevlogManager,
} from '@devlog/core';
import {
  AddDecisionArgs,
  AddDevlogNoteArgs,
  CloseDevlogArgs,
  CompleteDevlogArgs,
  DiscoverRelatedDevlogsArgs,
  GetActiveContextArgs,
  GetContextForAIArgs,
  ListDevlogsArgs,
  SearchDevlogsArgs,
  UpdateAIContextArgs,
  UpdateDevlogWithNoteArgs,
} from './types/tool-args.js';

export class MCPDevlogAdapter {
  private workspaceManager: WorkspaceDevlogManager;
  private config: DevlogConfig | null = null;
  private currentWorkspaceId: string | null = null; // In-memory current workspace

  constructor(defaultWorkspaceId?: string) {
    this.workspaceManager = new WorkspaceDevlogManager({
      fallbackToEnvConfig: true,
      createWorkspaceConfigIfMissing: true,
    });
    
    // Set default workspace from constructor argument or default to 'default'
    this.currentWorkspaceId = defaultWorkspaceId || 'default';
  }

  /**
   * Get the underlying WorkspaceDevlogManager for workspace-aware operations
   */
  get manager(): WorkspaceDevlogManager {
    return this.workspaceManager;
  }

  /**
   * Get the current workspace ID (in-memory only)
   */
  getCurrentWorkspaceId(): string {
    return this.currentWorkspaceId || 'default';
  }

  /**
   * Set the current workspace ID (in-memory only)
   */
  setCurrentWorkspaceId(workspaceId: string): void {
    this.currentWorkspaceId = workspaceId;
  }

  /**
   * Initialize the adapter with appropriate storage configuration
   */
  async initialize(): Promise<void> {
    await this.workspaceManager.initialize();
  }

  async createDevlog(args: CreateDevlogRequest): Promise<CallToolResult> {
    await this.ensureInitialized();

    // Switch to current workspace before creating devlog
    if (this.currentWorkspaceId) {
      await this.workspaceManager.switchToWorkspace(this.currentWorkspaceId);
    }

    const entry = await this.workspaceManager.createDevlog(args);

    return {
      content: [
        {
          type: 'text',
          text: `Created devlog entry: ${entry.id}\nTitle: ${entry.title}\nType: ${entry.type}\nPriority: ${entry.priority}\nStatus: ${entry.status}\n\nBusiness Context: ${entry.context?.businessContext}\nTechnical Context: ${entry.context?.technicalContext}`,
        },
      ],
    };
  }

  async updateDevlog(args: UpdateDevlogRequest): Promise<CallToolResult> {
    await this.ensureInitialized();

    const entry = await this.workspaceManager.updateDevlog(args.id, args);

    // Check if AI context was updated
    const aiFieldsProvided = !!(
      args.currentSummary ||
      args.keyInsights ||
      args.openQuestions ||
      args.suggestedNextSteps
    );
    const aiContextNote = aiFieldsProvided
      ? `\nAI Context Updated: ${entry.aiContext?.lastAIUpdate}`
      : '';

    return {
      content: [
        {
          type: 'text',
          text: `Updated devlog entry: ${entry.id}\nTitle: ${entry.title}\nStatus: ${entry.status}\nLast Updated: ${entry.updatedAt}${aiContextNote}\n\nTotal Notes: ${entry.notes.length}`,
        },
      ],
    };
  }

  async getDevlog(args: GetContextForAIArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    const entry = await this.workspaceManager.getDevlog(args.id);

    if (!entry) {
      return {
        content: [
          {
            type: 'text',
            text: `Devlog entry '${args.id}' not found.`,
          },
        ],
        isError: true,
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
  }

  async listDevlogs(args: ListDevlogsArgs = {}): Promise<CallToolResult> {
    await this.ensureInitialized();

    // Switch to current workspace before listing devlogs
    if (this.currentWorkspaceId) {
      await this.workspaceManager.switchToWorkspace(this.currentWorkspaceId);
    }

    const filter = {
      status: args.status ? [args.status] : undefined,
      type: args.type ? [args.type] : undefined,
      priority: args.priority ? [args.priority] : undefined,
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

    const result = await this.workspaceManager.listDevlogs(filter);

    // Handle both paginated and non-paginated results
    const entries = result.items;
    const pagination = result.pagination;

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

    let summary = entries
      .map(
        (entry) =>
          `- [${entry.status}] ${entry.title} (${entry.type}, ${entry.priority}) - ${entry.id}`,
      )
      .join('\n');

    // Add pagination info if available
    let resultText = `Found ${entries.length} devlog entries`;
    if (pagination) {
      resultText += ` (page ${pagination.page} of ${pagination.totalPages}, ${pagination.total} total)`;
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
  }

  async searchDevlogs(args: SearchDevlogsArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    const filter = {
      status: args.status ? [args.status] : undefined,
      type: args.type ? [args.type] : undefined,
      priority: args.priority ? [args.priority] : undefined,
    };

    const result = await this.workspaceManager.searchDevlogs(args.query, filter);
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
        (entry) =>
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
  }

  async addDevlogNote(args: AddDevlogNoteArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    // Switch to current workspace before operating
    if (this.currentWorkspaceId) {
      await this.workspaceManager.switchToWorkspace(this.currentWorkspaceId);
    }

    const category = (args.category || 'progress') as NoteCategory;
    const entry = await this.workspaceManager.addNote(args.id, args.note, category, {
      files: args.files,
      codeChanges: args.codeChanges,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Added ${category} note to devlog '${entry.id}':\n${args.note}\n\nTotal notes: ${entry.notes?.length || 0}`,
        },
      ],
    };
  }

  async addDecision(args: AddDecisionArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    const entry = await this.workspaceManager.getDevlog(args.id);
    if (!entry) {
      return {
        content: [
          {
            type: 'text',
            text: `Devlog entry '${args.id}' not found.`,
          },
        ],
        isError: true,
      };
    }

    const decision = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      decision: args.decision,
      rationale: args.rationale,
      alternatives: args.alternatives,
      decisionMaker: args.decisionMaker,
    };

    if (!entry.context) {
      entry.context = {} as DevlogContext;
    }
    if (!entry.context.decisions) {
      entry.context.decisions = [];
    }
    entry.context.decisions.push(decision);

    // Update the entry to trigger save
    const updated = await this.workspaceManager.updateDevlog(args.id, {
      // Use a field that exists in UpdateDevlogRequest to trigger save
      description: entry.description,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Added decision to devlog '${args.id}':\nDecision: ${args.decision}\nRationale: ${args.rationale}\nDecision Maker: ${args.decisionMaker}`,
        },
      ],
    };
  }

    async completeDevlog(args: CompleteDevlogArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    // Switch to current workspace before operating
    if (this.currentWorkspaceId) {
      await this.workspaceManager.switchToWorkspace(this.currentWorkspaceId);
    }

    const entry = await this.workspaceManager.completeDevlog(args.id, args.summary);

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
  }

  async closeDevlog(args: CloseDevlogArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    // Switch to current workspace before operating
    if (this.currentWorkspaceId) {
      await this.workspaceManager.switchToWorkspace(this.currentWorkspaceId);
    }

    const entry = await this.workspaceManager.closeDevlog(args.id, args.reason);

    return {
      content: [
        {
          type: 'text',
          text: `Closed devlog '${entry.id}': ${entry.title}\nStatus: ${entry.status}\nReason: ${args.reason || 'None provided'}`,
        },
      ],
    };
  }

  async archiveDevlog(args: { id: number }): Promise<CallToolResult> {
    await this.ensureInitialized();

    // Switch to current workspace before operating
    if (this.currentWorkspaceId) {
      await this.workspaceManager.switchToWorkspace(this.currentWorkspaceId);
    }

    const entry = await this.workspaceManager.archiveDevlog(args.id);

    return {
      content: [
        {
          type: 'text',
          text: `Archived devlog '${entry.id}': ${entry.title}\nArchived: ${entry.archived}`,
        },
      ],
    };
  }

  async unarchiveDevlog(args: { id: number }): Promise<CallToolResult> {
    await this.ensureInitialized();

    // Switch to current workspace before operating
    if (this.currentWorkspaceId) {
      await this.workspaceManager.switchToWorkspace(this.currentWorkspaceId);
    }

    const entry = await this.workspaceManager.unarchiveDevlog(args.id);

    return {
      content: [
        {
          type: 'text',
          text: `Unarchived devlog '${entry.id}': ${entry.title}\nArchived: ${entry.archived}`,
        },
      ],
    };
  }

  async getActiveContext(args: GetActiveContextArgs = {}): Promise<CallToolResult> {
    await this.ensureInitialized();

    const filter = {
      status: ['new', 'in-progress', 'blocked', 'in-review', 'testing'] as any[],
    };

    const result = await this.workspaceManager.listDevlogs(filter);
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
      .map((entry) => {
        const recentNotes = entry.notes.slice(-2);
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
          text: `${limited.length} active devlog entries:\n\n${summary}`,
        },
      ],
    };
  }

  async getContextForAI(args: GetContextForAIArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    // Switch to current workspace before operating
    if (this.currentWorkspaceId) {
      await this.workspaceManager.switchToWorkspace(this.currentWorkspaceId);
    }

    const entry = await this.workspaceManager.getContextForAI(args.id);

    if (!entry) {
      return {
        content: [
          {
            type: 'text',
            text: `Devlog entry '${args.id}' not found.`,
          },
        ],
        isError: true,
      };
    }

    const context = {
      id: entry.id,
      title: entry.title,
      type: entry.type,
      status: entry.status,
      priority: entry.priority,
      description: entry.description,
      context: entry.context,
      aiContext: entry.aiContext,
      recentNotes: entry.notes.slice(-5),
      totalNotes: entry.notes.length,
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
  }

  async updateAIContext(args: UpdateAIContextArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    // Switch to current workspace before operating
    if (this.currentWorkspaceId) {
      await this.workspaceManager.switchToWorkspace(this.currentWorkspaceId);
    }

    const contextUpdate: any = {};
    if (args.summary !== undefined) contextUpdate.summary = args.summary;
    if (args.insights !== undefined) contextUpdate.insights = args.insights;
    if (args.nextSteps !== undefined) contextUpdate.nextSteps = args.nextSteps;
    if (args.questions !== undefined) contextUpdate.questions = args.questions;
    if (args.patterns !== undefined) contextUpdate.patterns = args.patterns;

    const entry = await this.workspaceManager.updateAIContext(args.id, contextUpdate);

    return {
      content: [
        {
          type: 'text',
          text: `Updated AI context for devlog '${entry.title}' (ID: ${entry.id})`,
        },
      ],
    };
  }

  async dispose(): Promise<void> {
    if (this.workspaceManager) {
      await this.workspaceManager.cleanup();
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.config) {
      await this.initialize();
    }
  }

  async discoverRelatedDevlogs(args: DiscoverRelatedDevlogsArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    // Switch to current workspace before operating
    if (this.currentWorkspaceId) {
      await this.workspaceManager.switchToWorkspace(this.currentWorkspaceId);
    }

    const discoveryResult = await this.workspaceManager.discoverRelatedDevlogs(args);

    if (discoveryResult.relatedEntries.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text:
              `No related devlog entries found for:\n` +
              `Work: ${args.workDescription}\n` +
              `Type: ${args.workType}\n` +
              `Keywords: ${args.keywords?.join(', ') || 'None'}\n` +
              `Scope: ${args.scope || 'N/A'}\n\n` +
              `✅ Safe to create a new devlog entry - no overlapping work detected.`,
          },
        ],
      };
    }

    // Generate detailed analysis
    const analysis = discoveryResult.relatedEntries
      .slice(0, 10)
      .map(({ entry, relevance, matchedTerms }: DiscoveredDevlogEntry) => {
        const statusEmoji: Record<DevlogStatus, string> = {
          new: '🆕',
          'in-progress': '🔄',
          blocked: '🚫',
          'in-review': '👀',
          testing: '🧪',
          done: '✅',
          cancelled: '📦',
        };

        return (
          `${statusEmoji[entry.status]} **${entry.title}** (${entry.type})\n` +
          `   ID: ${entry.id}\n` +
          `   Status: ${entry.status} | Priority: ${entry.priority}\n` +
          `   Relevance: ${relevance} (matched: ${matchedTerms.join(', ')})\n` +
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
            `**Found ${discoveryResult.relatedEntries.length} related entries:**\n\n${analysis}\n\n${discoveryResult.recommendation}`,
        },
      ],
    };
  }

  async updateDevlogWithNote(args: UpdateDevlogWithNoteArgs): Promise<CallToolResult> {
    await this.ensureInitialized();

    // Switch to current workspace before operating
    if (this.currentWorkspaceId) {
      await this.workspaceManager.switchToWorkspace(this.currentWorkspaceId);
    }

    const updates: Partial<UpdateDevlogRequest> = {};
    if (args.status) updates.status = args.status;
    if (args.priority) updates.priority = args.priority;

    const entry = await this.workspaceManager.updateWithProgress(
      args.id,
      { id: args.id, ...updates },
      args.note,
      {
        category: args.category || 'progress',
        files: args.files,
        codeChanges: args.codeChanges,
      },
    );

    return {
      content: [
        {
          type: 'text',
          text: `Updated devlog '${entry.id}' and added ${args.category || 'progress'} note:\n${args.note}\n\nStatus: ${entry.status}\nTotal notes: ${entry.notes.length}`,
        },
      ],
    };
  }
}
