#!/usr/bin/env node

/**
 * MCP Server with flexible storage architecture
 * Supports multiple storage backends: JSON, SQLite, PostgreSQL, MySQL, Enterprise
 */

// Load environment variables from root .env file
import { loadRootEnv } from '@codervisor/devlog-core';

loadRootEnv();

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createMCPAdapterWithDiscovery, type MCPAdapter } from './adapters/index.js';
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
} from './types';
import { allTools } from './tools/index.js';
import {
  handleListWorkspaces,
  handleGetCurrentWorkspace,
  handleSwitchWorkspace,
} from './tools/workspace-tools.js';
// Chat tools re-enabled with stub implementations
import type {
  ImportChatHistoryArgs,
  GetChatSessionArgs,
  ListChatSessionsArgs,
  SearchChatContentArgs,
  LinkChatToDevlogArgs,
  UnlinkChatFromDevlogArgs,
  SuggestChatDevlogLinksArgs,
  GetChatStatsArgs,
  UpdateChatSessionArgs,
  GetChatWorkspacesArgs,
} from './tools/chat-tools.js';
import {
  handleImportChatHistory,
  handleGetChatSession,
  handleListChatSessions,
  handleSearchChatContent,
  handleLinkChatToDevlog,
  handleUnlinkChatFromDevlog,
  handleSuggestChatDevlogLinks,
  handleGetChatStats,
  handleUpdateChatSession,
  handleGetChatWorkspaces,
} from './tools/chat-tools.js';

const server = new Server(
  {
    name: 'devlog-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Initialize the adapter - will be set in main()
let adapter: MCPAdapter;

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: allTools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'create_devlog':
        return await adapter.createDevlog(args as unknown as CreateDevlogArgs);

      case 'discover_related_devlogs':
        return await adapter.discoverRelatedDevlogs(args as unknown as DiscoverRelatedDevlogsArgs);

      case 'update_devlog':
        return await adapter.updateDevlog(args as unknown as UpdateDevlogArgs);

      case 'get_devlog':
        return await adapter.getDevlog(args as unknown as GetContextForAIArgs);

      case 'list_devlogs':
        return await adapter.listDevlogs(args as unknown as ListDevlogsArgs);

      case 'search_devlogs':
        return await adapter.searchDevlogs(args as unknown as SearchDevlogsArgs);

      case 'add_devlog_note':
        return await adapter.addDevlogNote(args as unknown as AddDevlogNoteArgs);

      case 'update_devlog_with_note':
        return await adapter.updateDevlogWithNote(args as unknown as UpdateDevlogWithNoteArgs);

      case 'add_decision':
        return await adapter.addDecision(args as unknown as AddDecisionArgs);

      case 'complete_devlog':
        return await adapter.completeDevlog(args as unknown as CompleteDevlogArgs);

      case 'close_devlog':
        return await adapter.closeDevlog(args as unknown as CloseDevlogArgs);

      case 'archive_devlog':
        return await adapter.archiveDevlog(args as unknown as { id: number });

      case 'unarchive_devlog':
        return await adapter.unarchiveDevlog(args as unknown as { id: number });

      case 'get_active_context':
        return await adapter.getActiveContext(args as unknown as GetActiveContextArgs);

      case 'get_context_for_ai':
        return await adapter.getContextForAI(args as unknown as GetContextForAIArgs);

      case 'update_ai_context':
        return await adapter.updateAIContext(args as unknown as UpdateAIContextArgs);

      // Chat tools - re-enabled with stub implementations
      case 'import_chat_history':
        return await handleImportChatHistory(
          adapter.manager,
          args as unknown as ImportChatHistoryArgs,
        );

      case 'get_chat_session':
        return await handleGetChatSession(adapter.manager, args as unknown as GetChatSessionArgs);

      case 'list_chat_sessions':
        return await handleListChatSessions(
          adapter.manager,
          args as unknown as ListChatSessionsArgs,
        );

      case 'search_chat_content':
        return await handleSearchChatContent(
          adapter.manager,
          args as unknown as SearchChatContentArgs,
        );

      case 'link_chat_to_devlog':
        return await handleLinkChatToDevlog(
          adapter.manager,
          args as unknown as LinkChatToDevlogArgs,
        );

      case 'unlink_chat_from_devlog':
        return await handleUnlinkChatFromDevlog(
          adapter.manager,
          args as unknown as UnlinkChatFromDevlogArgs,
        );

      case 'suggest_chat_devlog_links':
        return await handleSuggestChatDevlogLinks(
          adapter.manager,
          args as unknown as SuggestChatDevlogLinksArgs,
        );

      case 'get_chat_stats':
        return await handleGetChatStats(adapter.manager, args as unknown as GetChatStatsArgs);

      case 'update_chat_session':
        return await handleUpdateChatSession(
          adapter.manager,
          args as unknown as UpdateChatSessionArgs,
        );

      case 'get_chat_workspaces':
        return await handleGetChatWorkspaces(
          adapter.manager,
          args as unknown as GetChatWorkspacesArgs,
        );
      //   );

      // Workspace management tools
      case 'list_workspaces':
        return await handleListWorkspaces(adapter.manager);

      case 'get_current_workspace':
        return await handleGetCurrentWorkspace(adapter);

      case 'switch_workspace':
        return await handleSwitchWorkspace(adapter, args as unknown as { workspaceId: string });

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  // Parse command line arguments for default workspace
  const args = process.argv.slice(2);
  const workspaceArgIndex = args.findIndex((arg) => arg === '--workspace' || arg === '-w');
  const defaultWorkspace =
    workspaceArgIndex !== -1 && args[workspaceArgIndex + 1]
      ? args[workspaceArgIndex + 1]
      : undefined;

  // Create adapter using factory with discovery
  const adapterInstance = await createMCPAdapterWithDiscovery();

  // If default workspace was specified, set it
  if (defaultWorkspace) {
    adapterInstance.setCurrentWorkspaceId(defaultWorkspace);
  }

  // Assign the adapter instance directly
  adapter = adapterInstance;

  const transport = new StdioServerTransport();
  await server.connect(transport);

  const workspaceInfo = defaultWorkspace ? ` (default workspace: ${defaultWorkspace})` : '';
  console.error(`Devlog MCP Server started with flexible storage architecture${workspaceInfo}`);
}

// Cleanup on process exit
process.on('SIGINT', async () => {
  console.error('Shutting down server...');
  await adapter.dispose();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Shutting down server...');
  await adapter.dispose();
  process.exit(0);
});

main().catch(console.error);
