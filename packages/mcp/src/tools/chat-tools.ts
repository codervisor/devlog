/**
 * MCP tools for chat history management
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { WorkspaceDevlogManager } from '@devlog/core';
import { DevlogApiClient } from '../api/devlog-api-client.js';

// Global API client instance
let apiClient: DevlogApiClient | null = null;

/**
 * Get or create API client instance
 */
function getApiClient(): DevlogApiClient {
  if (!apiClient) {
    const baseUrl = process.env.DEVLOG_API_BASE_URL || 'http://localhost:3200';
    apiClient = new DevlogApiClient({ baseUrl });
  }
  return apiClient;
}

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
export async function handleImportChatHistory(
  manager: WorkspaceDevlogManager,
  args: ImportChatHistoryArgs,
) {
  try {
    // Get API client for HTTP communication
    const apiClient = getApiClient();
    const currentWorkspace = await manager.getCurrentWorkspace();
    const workspaceId = currentWorkspace?.workspace.id || 'default';

    console.log(`[ChatTools] Starting chat import for workspace: ${workspaceId}`);

    // Start import via API
    const progress = await apiClient.importChatHistory(
      {
        source: args.source,
        autoLink: args.autoLink,
        autoLinkThreshold: args.autoLinkThreshold,
        includeArchived: args.includeArchived,
        overwriteExisting: args.overwriteExisting,
        background: args.background,
        dateRange: args.dateRange,
      },
      workspaceId,
    );

    return {
      content: [
        {
          type: 'text',
          text: `✅ Chat import started successfully!

**Import Details:**
- Import ID: ${progress.importId}
- Status: ${progress.status}
- Source: ${args.source}
- Auto-linking: ${args.autoLink ? 'enabled' : 'disabled'}
- Background: ${args.background ? 'yes' : 'no'}

**Progress:**
- Total sessions: ${progress.progress?.totalSessions || 0}
- Total messages: ${progress.progress?.totalMessages || 0}
- Processed: ${progress.progress?.processedSessions || 0} sessions
- Percentage: ${progress.progress?.percentage || 0}%

You can check progress with: get_chat_session with importId=${progress.importId}`,
        },
      ],
    };
  } catch (error: any) {
    console.error('[ChatTools] Import error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to start chat import: ${error.message}

Please check:
- Web API server is running
- Workspace exists and is accessible
- VS Code Copilot data is available
- Sufficient permissions for file access`,
        },
      ],
    };
  }
}

export async function handleGetChatSession(
  manager: WorkspaceDevlogManager,
  args: GetChatSessionArgs,
) {
  try {
    const apiClient = getApiClient();
    const currentWorkspace = await manager.getCurrentWorkspace();
    const workspaceId = currentWorkspace?.workspace.id || 'default';

    // Get chat session details
    const result = await apiClient.getChatSession(
      args.sessionId,
      {
        includeMessages: args.includeMessages,
        messageLimit: args.messageLimit,
      },
      workspaceId,
    );

    const session = result.session;
    const messages = result.messages || [];
    const links = result.links || [];

    return {
      content: [
        {
          type: 'text',
          text: `📱 **Chat Session: ${session.id}**

**Details:**
- Agent: ${session.agent}
- Timestamp: ${session.timestamp}
- Workspace: ${session.workspace || 'Unknown'}
- Title: ${session.title || 'Untitled'}
- Status: ${session.status}
- Message Count: ${session.messageCount}
- Duration: ${session.duration ? `${Math.round(session.duration / 1000)}s` : 'Unknown'}

**Linked Devlogs:**
${
  links.length > 0
    ? links
        .map(
          (link) =>
            `- Devlog #${link.devlogId} (confidence: ${Math.round(link.confidence * 100)}%)`,
        )
        .join('\n')
    : '- No linked devlogs'
}

**Messages:** ${messages.length > 0 ? `\n${messages.map((msg, i) => `${i + 1}. [${msg.role}] ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`).join('\n')}` : 'Not included (use includeMessages=true)'}`,
        },
      ],
    };
  } catch (error: any) {
    console.error('[ChatTools] Get session error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to get chat session: ${error.message}`,
        },
      ],
    };
  }
}

export async function handleListChatSessions(
  manager: WorkspaceDevlogManager,
  args: ListChatSessionsArgs,
) {
  try {
    const apiClient = getApiClient();
    const currentWorkspace = await manager.getCurrentWorkspace();
    const workspaceId = currentWorkspace?.workspace.id || 'default';

    // Build filter
    const filter: any = {};
    if (args.agent && args.agent.length > 0) {
      filter.agent = args.agent;
    }
    if (args.status && args.status.length > 0) {
      filter.status = args.status;
    }
    if (args.workspace && args.workspace.length > 0) {
      filter.workspace = args.workspace;
    }
    if (args.includeArchived !== undefined) {
      filter.includeArchived = args.includeArchived;
    }
    if (args.fromDate) {
      filter.fromDate = args.fromDate;
    }
    if (args.toDate) {
      filter.toDate = args.toDate;
    }
    if (args.minMessages) {
      filter.minMessages = args.minMessages;
    }
    if (args.maxMessages) {
      filter.maxMessages = args.maxMessages;
    }

    // Get sessions
    const result = await apiClient.listChatSessions(
      filter,
      {
        limit: args.limit,
        offset: args.offset,
      },
      workspaceId,
    );

    const sessions = result.sessions;

    return {
      content: [
        {
          type: 'text',
          text: `📋 **Chat Sessions (${sessions.length} found)**

${
  sessions.length === 0
    ? 'No chat sessions found matching the criteria.'
    : sessions
        .map(
          (session, i) => `${i + 1}. **${session.id}**
   - Agent: ${session.agent}
   - Time: ${new Date(session.timestamp).toLocaleString()}
   - Workspace: ${session.workspace || 'Unknown'}
   - Messages: ${session.messageCount}
   - Status: ${session.status}
   - Title: ${session.title?.substring(0, 60)}${session.title && session.title.length > 60 ? '...' : ''}
`,
        )
        .join('\n')
}

**Filters Applied:**
${
  Object.keys(filter).length > 0
    ? Object.entries(filter)
        .map(([key, value]) => `- ${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
        .join('\n')
    : '- None (showing all sessions)'
}`,
        },
      ],
    };
  } catch (error: any) {
    console.error('[ChatTools] List sessions error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to list chat sessions: ${error.message}`,
        },
      ],
    };
  }
}

export async function handleSearchChatContent(
  manager: WorkspaceDevlogManager,
  args: SearchChatContentArgs,
) {
  try {
    const apiClient = getApiClient();
    const currentWorkspace = await manager.getCurrentWorkspace();
    const workspaceId = currentWorkspace?.workspace.id || 'default';

    // Build filter
    const filter: any = {};
    if (args.agent && args.agent.length > 0) {
      filter.agent = args.agent;
    }
    if (args.workspace && args.workspace.length > 0) {
      filter.workspace = args.workspace;
    }
    if (args.includeArchived !== undefined) {
      filter.includeArchived = args.includeArchived;
    }

    // Search chat content
    const result = await apiClient.searchChatContent(args.query, filter, args.limit, workspaceId);

    const searchResults = result.results;

    return {
      content: [
        {
          type: 'text',
          text: `🔍 **Chat Search Results for: "${args.query}"**

**Found:** ${result.resultCount} matches

${
  searchResults.length === 0
    ? 'No matching chat content found.'
    : searchResults
        .map(
          (result, i) => `${i + 1}. **Session: ${result.session.id}**
   - Agent: ${result.session.agent}
   - Time: ${new Date(result.session.timestamp).toLocaleString()}
   - Workspace: ${result.session.workspace || 'Unknown'}
   - Matches: ${result.messages.length} messages
   - Relevance: ${Math.round(result.relevance * 100)}%
   
   **Sample matches:**
${result.messages
  .slice(0, 2)
  .map((match) => `   • [${match.message.role}] ${match.context}`)
  .join('\n')}
`,
        )
        .join('\n')
}

**Search Info:**
- Query: "${result.query}"
- Results: ${result.resultCount}
- Search type: ${args.searchType || 'exact'}`,
        },
      ],
    };
  } catch (error: any) {
    console.error('[ChatTools] Search error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to search chat content: ${error.message}`,
        },
      ],
    };
  }
}

export async function handleLinkChatToDevlog(
  manager: WorkspaceDevlogManager,
  args: LinkChatToDevlogArgs,
) {
  try {
    const apiClient = getApiClient();
    const currentWorkspace = await manager.getCurrentWorkspace();
    const workspaceId = currentWorkspace?.workspace.id || 'default';

    // Create the link
    const result = await apiClient.createChatDevlogLink(
      args.sessionId,
      args.devlogId,
      {
        confidence: 1.0, // Manual links get full confidence
        reason: 'manual',
        evidence: { notes: args.notes || '' },
        confirmed: true,
        createdBy: 'user',
      },
      workspaceId,
    );

    const link = result.link;

    return {
      content: [
        {
          type: 'text',
          text: `✅ **Chat-Devlog Link Created Successfully!**

**Link Details:**
- Session ID: ${link.sessionId}
- Devlog ID: ${link.devlogId}
- Confidence: ${Math.round(link.confidence * 100)}%
- Reason: ${link.reason}
- Created by: ${link.createdBy}
- Created at: ${new Date(link.createdAt).toLocaleString()}

**Status:** ${link.confirmed ? 'Confirmed' : 'Pending confirmation'}

This chat session is now linked to the devlog entry and will appear in related searches and context queries.`,
        },
      ],
    };
  } catch (error: any) {
    console.error('[ChatTools] Link creation error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to create chat-devlog link: ${error.message}

Please check:
- Session ID exists and is valid
- Devlog ID exists and is accessible
- You have permission to create links
- Web API server is running`,
        },
      ],
    };
  }
}

export async function handleUnlinkChatFromDevlog(
  manager: WorkspaceDevlogManager,
  args: UnlinkChatFromDevlogArgs,
) {
  try {
    const apiClient = getApiClient();
    const currentWorkspace = await manager.getCurrentWorkspace();
    const workspaceId = currentWorkspace?.workspace.id || 'default';

    // Remove the link
    await apiClient.removeChatDevlogLink(args.sessionId, args.devlogId, workspaceId);

    return {
      content: [
        {
          type: 'text',
          text: `✅ **Chat-Devlog Link Removed Successfully!**

**Removed Link:**
- Session ID: ${args.sessionId}
- Devlog ID: ${args.devlogId}

The chat session is no longer linked to the devlog entry.`,
        },
      ],
    };
  } catch (error: any) {
    console.error('[ChatTools] Unlink error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to remove chat-devlog link: ${error.message}

Please check:
- Link exists between the specified session and devlog
- You have permission to modify links
- Web API server is running`,
        },
      ],
    };
  }
}

export async function handleSuggestChatDevlogLinks(
  _manager: WorkspaceDevlogManager,
  _args: SuggestChatDevlogLinksArgs,
) {
  // TODO: Implement chat-devlog link suggestions with WorkspaceDevlogManager
  return {
    content: [
      {
        type: 'text',
        text: `❌ Chat-devlog link suggestions are not yet implemented in workspace-aware architecture.

This feature is currently being migrated to work with WorkspaceDevlogManager.
Please check back in a future release.`,
      },
    ],
  };
}

export async function handleGetChatStats(
  _manager: WorkspaceDevlogManager,
  _args: GetChatStatsArgs,
) {
  // TODO: Implement chat statistics with WorkspaceDevlogManager
  return {
    content: [
      {
        type: 'text',
        text: `❌ Chat statistics are not yet implemented in workspace-aware architecture.

This feature is currently being migrated to work with WorkspaceDevlogManager.
Please check back in a future release.`,
      },
    ],
  };
}

export async function handleUpdateChatSession(
  _manager: WorkspaceDevlogManager,
  _args: UpdateChatSessionArgs,
) {
  // TODO: Implement chat session updates with WorkspaceDevlogManager
  return {
    content: [
      {
        type: 'text',
        text: `❌ Chat session updates are not yet implemented in workspace-aware architecture.

This feature is currently being migrated to work with WorkspaceDevlogManager.
Please check back in a future release.`,
      },
    ],
  };
}

export async function handleGetChatWorkspaces(
  _manager: WorkspaceDevlogManager,
  _args: GetChatWorkspacesArgs,
) {
  // TODO: Implement chat workspace listing with WorkspaceDevlogManager
  return {
    content: [
      {
        type: 'text',
        text: `❌ Chat workspace listing is not yet implemented in workspace-aware architecture.

This feature is currently being migrated to work with WorkspaceDevlogManager.
Please check back in a future release.`,
      },
    ],
  };
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
