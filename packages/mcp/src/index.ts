#!/usr/bin/env node

/**
 * MCP Server with HTTP API architecture
 * Uses secure HTTP API client for all devlog operations
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
  handleListProjects,
  handleGetCurrentProject,
  handleSwitchProject,
} from './tools/project-tools.js';

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

      // Project management tools
      case 'list_projects':
        return await handleListProjects(adapter.manager);

      case 'get_current_project':
        return await handleGetCurrentProject(adapter);

      case 'switch_project':
        return await handleSwitchProject(adapter, args as unknown as { projectId: string });

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
  // Parse command line arguments for default project
  const args = process.argv.slice(2);
  const projectArgIndex = args.findIndex((arg) => arg === '--project' || arg === '-p');
  const defaultProject =
    projectArgIndex !== -1 && args[projectArgIndex + 1]
      ? args[projectArgIndex + 1]
      : process.env.MCP_DEFAULT_PROJECT || 'default';

  // Create adapter using factory with discovery
  const adapterInstance = await createMCPAdapterWithDiscovery();

  // If default project was specified, set it
  if (defaultProject) {
    // TODO: Implement setCurrentProjectId in adapter
    // adapterInstance.setCurrentProjectId(defaultProject);
  }

  // Assign the adapter instance directly
  adapter = adapterInstance;

  const transport = new StdioServerTransport();
  await server.connect(transport);

  const projectInfo = defaultProject ? ` (default project: ${defaultProject})` : '';
  console.error(`Devlog MCP Server started with flexible storage architecture${projectInfo}`);
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
