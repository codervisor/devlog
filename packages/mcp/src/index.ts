#!/usr/bin/env node

/**
 * MCP Server with flexible storage architecture
 * Supports multiple storage backends: JSON, SQLite, PostgreSQL, MySQL, Enterprise
 */

// Load environment variables from .env file
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { MCPDevlogAdapter } from './mcp-adapter.js';
import { allTools } from './tools/index.js';
import {
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
} from './types/tool-args.js';

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

// Initialize the adapter
const adapter = new MCPDevlogAdapter();

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

      case 'get_active_context':
        return await adapter.getActiveContext(args as unknown as GetActiveContextArgs);

      case 'get_context_for_ai':
        return await adapter.getContextForAI(args as unknown as GetContextForAIArgs);

      case 'update_ai_context':
        return await adapter.updateAIContext(args as unknown as UpdateAIContextArgs);

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
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Devlog MCP Server started with flexible storage architecture');
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
