/**
 * MCP tools for chat history management
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DevlogManager, ImportChatHistoryRequest } from '@devlog/core';
import { createErrorResponse } from '../utils/common.js';

// Export MCP Tool argument interfaces for better type safety
export interface ImportChatHistoryArgs {
  source?: 'codehist' | 'vs-code';
  autoLink?: boolean;
  autoLinkThreshold?: number;
  includeArchived?: boolean;
  overwriteExisting?: boolean;
  background?: boolean;
  dateRange?: {
    from?: string;
    to?: string;
  };
  workspaceFilter?: string[];
}

export interface GetChatSessionArgs {
  sessionId: string;
  includeMessages?: boolean;
  messageLimit?: number;
}

export interface ListChatSessionsArgs {
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  workspace?: string[];
  agent?: string[];
  fromDate?: string;
  toDate?: string;
  linkedDevlog?: number;
  status?: string[];
  minMessages?: number;
  maxMessages?: number;
  sort?: {
    field?: 'timestamp' | 'messageCount' | 'duration' | 'updatedAt';
    direction?: 'asc' | 'desc';
  };
}

export interface SearchChatContentArgs {
  query: string;
  searchType?: 'exact' | 'fuzzy' | 'semantic';
  caseSensitive?: boolean;
  workspace?: string[];
  agent?: string[];
  includeArchived?: boolean;
  limit?: number;
}

export interface LinkChatToDevlogArgs {
  sessionId: string;
  devlogId: number;
  manual?: boolean;
  notes?: string;
}

export interface UnlinkChatFromDevlogArgs {
  sessionId: string;
  devlogId: number;
}

export interface GetChatStatsArgs {
  workspace?: string[];
  agent?: string[];
  fromDate?: string;
  toDate?: string;
  includeTemporalAnalysis?: boolean;
  includeWorkspaceDetails?: boolean;
}

export interface UpdateChatSessionArgs {
  sessionId: string;
  title?: string;
  status?: 'imported' | 'linked' | 'archived' | 'processed';
  tags?: string[];
  archived?: boolean;
  workspace?: string;
}

export interface SuggestChatDevlogLinksArgs {
  sessionId?: string;
  devlogId?: number;
  limit?: number;
  minConfidence?: number;
}

export interface GetChatWorkspacesArgs {
  includeInactive?: boolean;
  minSessions?: number;
}

export const importChatHistoryTool: Tool = {
  name: 'import_chat_history',
  description: 'Import chat history from GitHub Copilot (via codehist) into devlog storage',
  inputSchema: {
    type: 'object',
    properties: {
      source: {
        type: 'string',
        enum: ['codehist', 'vs-code'],
        default: 'codehist',
        description: 'Source to import chat history from',
      },
      autoLink: {
        type: 'boolean',
        default: true,
        description: 'Whether to automatically link chat sessions to devlog entries',
      },
      autoLinkThreshold: {
        type: 'number',
        default: 0.8,
        minimum: 0,
        maximum: 1,
        description: 'Confidence threshold for automatic linking (0-1)',
      },
      includeArchived: {
        type: 'boolean',
        default: false,
        description: 'Whether to import archived chat sessions',
      },
      overwriteExisting: {
        type: 'boolean',
        default: false,
        description: 'Whether to overwrite existing chat sessions',
      },
      dateRange: {
        type: 'object',
        properties: {
          from: {
            type: 'string',
            format: 'date-time',
            description: 'Start date for import (ISO string)',
          },
          to: {
            type: 'string',
            format: 'date-time',
            description: 'End date for import (ISO string)',
          },
        },
        description: 'Optional date range filter for import',
      },
      background: {
        type: 'boolean',
        default: true,
        description: 'Whether to run import in background',
      },
    },
    required: [],
  },
};

export const getChatSessionTool: Tool = {
  name: 'get_chat_session',
  description: 'Get details of a specific chat session including messages',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'ID of the chat session to retrieve',
      },
      includeMessages: {
        type: 'boolean',
        default: true,
        description: 'Whether to include chat messages in the response',
      },
      messageLimit: {
        type: 'number',
        default: 100,
        minimum: 1,
        maximum: 1000,
        description: 'Maximum number of messages to retrieve',
      },
    },
    required: ['sessionId'],
  },
};

export const listChatSessionsTool: Tool = {
  name: 'list_chat_sessions',
  description: 'List chat sessions with optional filtering and pagination',
  inputSchema: {
    type: 'object',
    properties: {
      agent: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['GitHub Copilot', 'Cursor', 'Windsurf', 'Claude', 'ChatGPT', 'Other'],
        },
        description: 'Filter by AI agent type',
      },
      status: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['imported', 'linked', 'archived', 'processed'],
        },
        description: 'Filter by chat session status',
      },
      workspace: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Filter by workspace names',
      },
      linkedDevlog: {
        type: 'number',
        description: 'Filter sessions linked to specific devlog ID',
      },
      fromDate: {
        type: 'string',
        format: 'date-time',
        description: 'Filter sessions from this date',
      },
      toDate: {
        type: 'string',
        format: 'date-time',
        description: 'Filter sessions until this date',
      },
      includeArchived: {
        type: 'boolean',
        default: false,
        description: 'Include archived sessions',
      },
      minMessages: {
        type: 'number',
        minimum: 1,
        description: 'Minimum number of messages in session',
      },
      maxMessages: {
        type: 'number',
        minimum: 1,
        description: 'Maximum number of messages in session',
      },
      offset: {
        type: 'number',
        default: 0,
        minimum: 0,
        description: 'Pagination offset',
      },
      limit: {
        type: 'number',
        default: 20,
        minimum: 1,
        maximum: 100,
        description: 'Maximum number of sessions to return',
      },
      sort: {
        type: 'object',
        properties: {
          field: {
            type: 'string',
            enum: ['timestamp', 'messageCount', 'duration', 'updatedAt'],
            default: 'timestamp',
          },
          direction: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc',
          },
        },
        description: 'Sort criteria',
      },
    },
    required: [],
  },
};

export const searchChatContentTool: Tool = {
  name: 'search_chat_content',
  description: 'Search chat messages for specific content with highlighting',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query for chat content',
      },
      searchType: {
        type: 'string',
        enum: ['exact', 'fuzzy', 'semantic'],
        default: 'exact',
        description: 'Type of search to perform',
      },
      caseSensitive: {
        type: 'boolean',
        default: false,
        description: 'Whether search should be case sensitive',
      },
      includeArchived: {
        type: 'boolean',
        default: false,
        description: 'Include archived sessions in search',
      },
      agent: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['GitHub Copilot', 'Cursor', 'Windsurf', 'Claude', 'ChatGPT', 'Other'],
        },
        description: 'Filter by AI agent type',
      },
      workspace: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Filter by workspace names',
      },
      limit: {
        type: 'number',
        default: 50,
        minimum: 1,
        maximum: 200,
        description: 'Maximum number of results to return',
      },
    },
    required: ['query'],
  },
};

export const linkChatToDevlogTool: Tool = {
  name: 'link_chat_to_devlog',
  description: 'Create a link between a chat session and a devlog entry',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'ID of the chat session to link',
      },
      devlogId: {
        type: 'number',
        description: 'ID of the devlog entry to link to',
      },
      manual: {
        type: 'boolean',
        default: true,
        description: 'Whether this is a manual link (true) or system suggestion (false)',
      },
      notes: {
        type: 'string',
        description: 'Optional notes about why this link was created',
      },
    },
    required: ['sessionId', 'devlogId'],
  },
};

export const unlinkChatFromDevlogTool: Tool = {
  name: 'unlink_chat_from_devlog',
  description: 'Remove a link between a chat session and a devlog entry',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'ID of the chat session to unlink',
      },
      devlogId: {
        type: 'number',
        description: 'ID of the devlog entry to unlink from',
      },
    },
    required: ['sessionId', 'devlogId'],
  },
};

export const suggestChatDevlogLinksTool: Tool = {
  name: 'suggest_chat_devlog_links',
  description: 'Get AI-powered suggestions for linking chat sessions to devlog entries',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'Specific session ID to find suggestions for (optional)',
      },
      devlogId: {
        type: 'number',
        description: 'Specific devlog ID to find suggestions for (optional)',
      },
      minConfidence: {
        type: 'number',
        default: 0.5,
        minimum: 0,
        maximum: 1,
        description: 'Minimum confidence threshold for suggestions',
      },
      limit: {
        type: 'number',
        default: 10,
        minimum: 1,
        maximum: 50,
        description: 'Maximum number of suggestions to return',
      },
    },
    required: [],
  },
};

export const getChatStatsTool: Tool = {
  name: 'get_chat_stats',
  description: 'Get comprehensive statistics about chat sessions and usage',
  inputSchema: {
    type: 'object',
    properties: {
      agent: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['GitHub Copilot', 'Cursor', 'Windsurf', 'Claude', 'ChatGPT', 'Other'],
        },
        description: 'Filter statistics by AI agent type',
      },
      workspace: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Filter statistics by workspace',
      },
      fromDate: {
        type: 'string',
        format: 'date-time',
        description: 'Include sessions from this date',
      },
      toDate: {
        type: 'string',
        format: 'date-time',
        description: 'Include sessions until this date',
      },
      includeWorkspaceDetails: {
        type: 'boolean',
        default: true,
        description: 'Include detailed workspace breakdown',
      },
      includeTemporalAnalysis: {
        type: 'boolean',
        default: false,
        description: 'Include temporal usage patterns',
      },
    },
    required: [],
  },
};

export const updateChatSessionTool: Tool = {
  name: 'update_chat_session',
  description: 'Update properties of a chat session (title, status, tags, etc.)',
  inputSchema: {
    type: 'object',
    properties: {
      sessionId: {
        type: 'string',
        description: 'ID of the chat session to update',
      },
      title: {
        type: 'string',
        description: 'New title for the session',
      },
      status: {
        type: 'string',
        enum: ['imported', 'linked', 'archived', 'processed'],
        description: 'New status for the session',
      },
      tags: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Tags to associate with the session',
      },
      archived: {
        type: 'boolean',
        description: 'Whether to archive the session',
      },
      workspace: {
        type: 'string',
        description: 'Update workspace association',
      },
    },
    required: ['sessionId'],
  },
};

export const getChatWorkspacesTool: Tool = {
  name: 'get_chat_workspaces',
  description: 'List all chat workspaces with session counts and activity',
  inputSchema: {
    type: 'object',
    properties: {
      includeInactive: {
        type: 'boolean',
        default: false,
        description: 'Include workspaces with no recent activity',
      },
      minSessions: {
        type: 'number',
        default: 1,
        minimum: 0,
        description: 'Minimum session count threshold',
      },
    },
    required: [],
  },
};

// Tool implementations
export async function handleImportChatHistory(manager: DevlogManager, args: ImportChatHistoryArgs) {
  try {
    const config: ImportChatHistoryRequest['config'] = {
      source: args.source || 'codehist',
      sourceConfig: {
        background: args.background !== false,
      },
      autoLink: args.autoLink !== false,
      autoLinkThreshold: args.autoLinkThreshold || 0.8,
      includeArchived: args.includeArchived || false,
      dateRange:
        args.dateRange && args.dateRange.from && args.dateRange.to
          ? { from: args.dateRange.from, to: args.dateRange.to }
          : undefined,
      workspaceFilter: args.workspaceFilter,
      overwriteExisting: args.overwriteExisting || false,
    };

    // Get the chat import service
    const chatService = manager.getChatImportService();
    const progress = await chatService.importFromCodehist(config);

    return {
      content: [
        {
          type: 'text',
          text: `Chat history import started successfully.

Import ID: ${progress.importId}
Status: ${progress.status}
Source: ${progress.source}
Background: ${config.sourceConfig.background}
Auto-linking: ${config.autoLink} (threshold: ${config.autoLinkThreshold})

The import is running in the background. Use the import ID to check progress.`,
        },
      ],
    };
  } catch (error: unknown) {
    return createErrorResponse('importing chat history', error);
  }
}

export async function handleGetChatSession(manager: DevlogManager, args: GetChatSessionArgs) {
  try {
    const sessionId = args.sessionId;
    const session = await manager.getChatSession(sessionId);

    if (!session) {
      return {
        content: [
          {
            type: 'text',
            text: `Chat session not found: ${sessionId}`,
          },
        ],
        isError: true,
      };
    }

    let messages: unknown[] = [];
    if (args.includeMessages !== false) {
      messages = await manager.getChatMessages(sessionId, 0, args.messageLimit || 100);
    }

    return {
      content: [
        {
          type: 'text',
          text: `## Chat Session: ${session.title || session.id}

**Agent:** ${session.agent}
**Timestamp:** ${session.timestamp}
**Workspace:** ${session.workspace || 'Unknown'}
**Status:** ${session.status}
**Message Count:** ${session.messageCount}
**Linked Devlogs:** ${session.linkedDevlogs.length}
**Tags:** ${session.tags.join(', ') || 'None'}

${
  messages.length > 0
    ? `\n### Messages (${messages.length}):\n\n${messages
        .map(
          (msg: any, i: number) =>
            `**${i + 1}. ${msg.role.toUpperCase()}** (${msg.timestamp}):\n${msg.content}\n`,
        )
        .join('\n')}`
    : ''
}`,
        },
      ],
    };
  } catch (error: unknown) {
    return createErrorResponse('getting chat session', error);
  }
}

export async function handleListChatSessions(manager: DevlogManager, args: ListChatSessionsArgs) {
  try {
    const filter = {
      agent: args.agent,
      status: args.status,
      workspace: args.workspace,
      linkedDevlog: args.linkedDevlog,
      fromDate: args.fromDate,
      toDate: args.toDate,
      includeArchived: args.includeArchived || false,
      minMessages: args.minMessages,
      maxMessages: args.maxMessages,
    };

    const sessions = await manager.listChatSessions(filter, args.offset || 0, args.limit || 20);

    if (sessions.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No chat sessions found matching the specified criteria.',
          },
        ],
      };
    }

    const sessionsText = sessions
      .map(
        (session, i) =>
          `**${i + 1}. ${session.title || session.id}**
Agent: ${session.agent}
Workspace: ${session.workspace || 'Unknown'}
Messages: ${session.messageCount}
Status: ${session.status}
Timestamp: ${session.timestamp}
Linked Devlogs: ${session.linkedDevlogs.length}
${session.archived ? '📁 *Archived*' : ''}
`,
      )
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `## Chat Sessions (${sessions.length} found)

${sessionsText}

*Showing ${args.offset || 0 + 1}-${Math.min((args.offset || 0) + sessions.length, (args.offset || 0) + (args.limit || 20))} of available sessions*`,
        },
      ],
    };
  } catch (error: unknown) {
    return createErrorResponse('listing chat sessions', error);
  }
}

export async function handleSearchChatContent(manager: DevlogManager, args: SearchChatContentArgs) {
  try {
    const query = args.query;
    const filter = {
      agent: args.agent,
      workspace: args.workspace,
      includeArchived: args.includeArchived || false,
    };

    const results = await manager.searchChatContent(query, filter, args.limit || 50);

    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No chat content found matching "${query}".`,
          },
        ],
      };
    }

    const resultsText = results
      .map((result, i) => {
        const session = result.session;
        const messageMatches = result.messages
          .map((msgResult: any) => `    • **${msgResult.message.role}**: ${msgResult.context}`)
          .join('\n');

        return `**${i + 1}. ${session.title || session.id}** (Score: ${result.relevance.toFixed(2)})
Workspace: ${session.workspace || 'Unknown'}
Agent: ${session.agent}
Matches: ${result.messages.length}

${messageMatches}
`;
      })
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `## Chat Search Results for "${query}"

Found ${results.length} sessions with matching content:

${resultsText}`,
        },
      ],
    };
  } catch (error: unknown) {
    return createErrorResponse('searching chat content', error);
  }
}

export async function handleLinkChatToDevlog(manager: DevlogManager, args: LinkChatToDevlogArgs) {
  try {
    const sessionId = args.sessionId;
    const devlogId = args.devlogId;

    // Verify session and devlog exist
    const session = await manager.getChatSession(sessionId);
    if (!session) {
      return {
        content: [
          {
            type: 'text',
            text: `Chat session not found: ${sessionId}`,
          },
        ],
        isError: true,
      };
    }

    const devlog = await manager.getDevlog(devlogId);
    if (!devlog) {
      return {
        content: [
          {
            type: 'text',
            text: `Devlog entry not found: ${devlogId}`,
          },
        ],
        isError: true,
      };
    }

    // Create the link
    const link = {
      sessionId,
      devlogId,
      confidence: 1.0, // Manual links get full confidence
      reason: 'manual' as const,
      evidence: {
        manual: {
          notes: args.notes || 'Manually linked by user',
        },
      },
      confirmed: true,
      createdAt: new Date().toISOString(),
      createdBy: 'user',
    };

    await manager.saveChatDevlogLink(link);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Successfully linked chat session to devlog entry:

**Chat Session:** ${session.title || sessionId}
**Devlog Entry:** #${devlogId} - ${devlog.title}
**Workspace:** ${session.workspace || 'Unknown'}
**Notes:** ${args.notes || 'Manually linked by user'}

The link has been confirmed and saved.`,
        },
      ],
    };
  } catch (error: unknown) {
    return createErrorResponse('linking chat to devlog', error);
  }
}

export async function handleUnlinkChatFromDevlog(
  manager: DevlogManager,
  args: UnlinkChatFromDevlogArgs,
) {
  try {
    await manager.removeChatDevlogLink(args.sessionId, args.devlogId);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Successfully removed link between chat session ${args.sessionId} and devlog entry #${args.devlogId}.`,
        },
      ],
    };
  } catch (error: unknown) {
    return createErrorResponse('unlinking chat from devlog', error);
  }
}

export async function handleSuggestChatDevlogLinks(
  manager: DevlogManager,
  args: SuggestChatDevlogLinksArgs,
) {
  try {
    const chatService = manager.getChatImportService();
    const suggestions = await chatService.suggestChatDevlogLinks(
      args.sessionId,
      args.minConfidence || 0.5,
    );

    if (suggestions.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No link suggestions found with confidence >= ${args.minConfidence || 0.5}.`,
          },
        ],
      };
    }

    const limited = suggestions.slice(0, args.limit || 10);
    const suggestionsText = limited
      .map((suggestion: any, i: number) => {
        const confidence = (suggestion.confidence * 100).toFixed(1);
        return `**${i + 1}. Session ${suggestion.sessionId} ↔ Devlog #${suggestion.devlogId}**
Confidence: ${confidence}%
Reason: ${suggestion.reason}
Created: ${suggestion.createdAt}
Confirmed: ${suggestion.confirmed ? '✅' : '❓'}
`;
      })
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `## Chat-Devlog Link Suggestions

Found ${suggestions.length} potential links (showing top ${limited.length}):

${suggestionsText}

Use \`link_chat_to_devlog\` to confirm any of these suggestions.`,
        },
      ],
    };
  } catch (error: unknown) {
    return createErrorResponse('getting link suggestions', error);
  }
}

export async function handleGetChatStats(manager: DevlogManager, args: GetChatStatsArgs) {
  try {
    const filter = {
      agent: args.agent,
      workspace: args.workspace,
      fromDate: args.fromDate,
      toDate: args.toDate,
    };

    const stats = await manager.getChatStats(filter);

    const agentStats = Object.entries(stats.byAgent)
      .filter(([_, count]) => count > 0)
      .map(([agent, count]) => `  • ${agent}: ${count}`)
      .join('\n');

    const statusStats = Object.entries(stats.byStatus)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => `  • ${status}: ${count}`)
      .join('\n');

    const workspaceStats = Object.entries(stats.byWorkspace)
      .slice(0, 10) // Top 10 workspaces
      .map(
        ([workspace, data]) =>
          `  • ${workspace}: ${data.sessions} sessions, ${data.messages} messages`,
      )
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `## Chat Statistics

### Overview
• **Total Sessions:** ${stats.totalSessions}
• **Total Messages:** ${stats.totalMessages}
• **Date Range:** ${stats.dateRange.earliest || 'N/A'} to ${stats.dateRange.latest || 'N/A'}

### By Agent
${agentStats || '  No agent data available'}

### By Status  
${statusStats || '  No status data available'}

### Linking Statistics
• **Linked Sessions:** ${stats.linkageStats.linked}
• **Unlinked Sessions:** ${stats.linkageStats.unlinked}
• **Multi-linked Sessions:** ${stats.linkageStats.multiLinked}

### Top Workspaces
${workspaceStats || '  No workspace data available'}`,
        },
      ],
    };
  } catch (error: unknown) {
    return createErrorResponse('getting chat statistics', error);
  }
}

export async function handleUpdateChatSession(manager: DevlogManager, args: UpdateChatSessionArgs) {
  try {
    const updates = {
      title: args.title,
      status: args.status,
      tags: args.tags,
      archived: args.archived,
      workspace: args.workspace,
    };

    await manager.updateChatSession(args.sessionId, updates);

    const updatesList = Object.entries(updates)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `• ${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `✅ Successfully updated chat session ${args.sessionId}:

${updatesList}`,
        },
      ],
    };
  } catch (error: unknown) {
    return createErrorResponse('updating chat session', error);
  }
}

export async function handleGetChatWorkspaces(manager: DevlogManager, args: GetChatWorkspacesArgs) {
  try {
    const workspaces = await manager.getChatWorkspaces();

    let filtered = workspaces;
    if (args.minSessions && args.minSessions > 0) {
      filtered = workspaces.filter((w) => w.sessionCount >= (args.minSessions || 0));
    }

    if (filtered.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No chat workspaces found matching the criteria.',
          },
        ],
      };
    }

    const workspacesText = filtered
      .map(
        (workspace, i) =>
          `**${i + 1}. ${workspace.name}**
Path: ${workspace.path || 'Unknown'}
Source: ${workspace.source}
Sessions: ${workspace.sessionCount}
First Seen: ${workspace.firstSeen}
Last Seen: ${workspace.lastSeen}
Devlog Workspace: ${workspace.devlogWorkspace || 'Not mapped'}
`,
      )
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `## Chat Workspaces (${filtered.length} found)

${workspacesText}`,
        },
      ],
    };
  } catch (error: unknown) {
    return createErrorResponse('getting chat workspaces', error);
  }
}

// Chat tools collection
export const chatTools = [
  importChatHistoryTool,
  getChatSessionTool,
  listChatSessionsTool,
  searchChatContentTool,
  linkChatToDevlogTool,
  unlinkChatFromDevlogTool,
  suggestChatDevlogLinksTool,
  getChatStatsTool,
  updateChatSessionTool,
  getChatWorkspacesTool,
];
