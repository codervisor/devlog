/**
 * MCP tools for chat history management
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { WorkspaceDevlogManager, ImportChatHistoryRequest } from '@devlog/core';
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
export async function handleImportChatHistory(manager: WorkspaceDevlogManager, args: ImportChatHistoryArgs) {
  try {
    // TODO: Implement chat import service integration with WorkspaceDevlogManager
    return {
      content: [
        {
          type: 'text',
          text: `❌ Chat history import is not yet implemented in workspace-aware architecture.

This feature is currently being migrated to work with WorkspaceDevlogManager.
Please check back in a future release.`,
        },
      ],
    };
  } catch (error: unknown) {
    return createErrorResponse('importing chat history', error);
  }
}

export async function handleGetChatSession(manager: WorkspaceDevlogManager, args: GetChatSessionArgs) {
  try {
    // TODO: Implement chat session retrieval with WorkspaceDevlogManager
    return {
      content: [
        {
          type: 'text',
          text: `❌ Chat session retrieval is not yet implemented in workspace-aware architecture.

This feature is currently being migrated to work with WorkspaceDevlogManager.
Please check back in a future release.`,
        },
      ],
    };
  } catch (error: unknown) {
    return createErrorResponse('getting chat session', error);
  }
}

export async function handleListChatSessions(manager: WorkspaceDevlogManager, args: ListChatSessionsArgs) {
  try {
    // TODO: Implement chat session listing with WorkspaceDevlogManager
    return {
      content: [
        {
          type: 'text',
          text: `❌ Chat session listing is not yet implemented in workspace-aware architecture.

This feature is currently being migrated to work with WorkspaceDevlogManager.
Please check back in a future release.`,
        },
      ],
    };
  } catch (error: unknown) {
    return createErrorResponse('listing chat sessions', error);
  }
}

export async function handleSearchChatContent(manager: WorkspaceDevlogManager, args: SearchChatContentArgs) {
  try {
    // TODO: Implement chat content search with WorkspaceDevlogManager
    return {
      content: [
        {
          type: 'text',
          text: `❌ Chat content search is not yet implemented in workspace-aware architecture.

This feature is currently being migrated to work with WorkspaceDevlogManager.
Please check back in a future release.`,
        },
      ],
    };
  } catch (error: unknown) {
    return createErrorResponse('searching chat content', error);
  }
}

export async function handleLinkChatToDevlog(manager: WorkspaceDevlogManager, args: LinkChatToDevlogArgs) {
  try {
    // TODO: Implement chat-devlog linking with WorkspaceDevlogManager  
    return {
      content: [
        {
          type: 'text',
          text: `❌ Chat-devlog linking is not yet implemented in workspace-aware architecture.

This feature is currently being migrated to work with WorkspaceDevlogManager.
Please check back in a future release.`,
        },
      ],
    };
  } catch (error: unknown) {
    return createErrorResponse('linking chat to devlog', error);
  }
}

export async function handleUnlinkChatFromDevlog(
  manager: WorkspaceDevlogManager,
  args: UnlinkChatFromDevlogArgs,
) {
  try {
    // TODO: Implement chat-devlog unlinking with WorkspaceDevlogManager
    return {
      content: [
        {
          type: 'text',
          text: `❌ Chat-devlog unlinking is not yet implemented in workspace-aware architecture.

This feature is currently being migrated to work with WorkspaceDevlogManager.
Please check back in a future release.`,
        },
      ],
    };
  } catch (error: unknown) {
    return createErrorResponse('unlinking chat from devlog', error);
  }
}

export async function handleSuggestChatDevlogLinks(
  manager: WorkspaceDevlogManager,
  args: SuggestChatDevlogLinksArgs,
) {
  try {
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
  } catch (error: unknown) {
    return createErrorResponse('getting link suggestions', error);
  }
}

export async function handleGetChatStats(manager: WorkspaceDevlogManager, args: GetChatStatsArgs) {
  try {
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
  } catch (error: unknown) {
    return createErrorResponse('getting chat statistics', error);
  }
}

export async function handleUpdateChatSession(manager: WorkspaceDevlogManager, args: UpdateChatSessionArgs) {
  try {
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
  } catch (error: unknown) {
    return createErrorResponse('updating chat session', error);
  }
}

export async function handleGetChatWorkspaces(manager: WorkspaceDevlogManager, args: GetChatWorkspacesArgs) {
  try {
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
