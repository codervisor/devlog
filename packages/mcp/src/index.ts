#!/usr/bin/env node

/**
 * MCP Server - Clean, simplified implementation
 * Uses single adapter with standardized responses
 */

// Load environment variables
import { loadRootEnv } from '@codervisor/devlog-core';
loadRootEnv();

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MCPAdapter, type MCPAdapterConfig } from './adapters/index.js';
import { allTools } from './tools/index.js';
import { toolHandlers } from './handlers/tool-handlers.js';

const server = new Server(
  {
    name: 'devlog-mcp',
    version: '1.0.0',
    description: `Devlog Management Server - AI-native work item tracking system

TERMINOLOGY & CONTEXT:
• "Devlog" = Work item, task, ticket, issue, or entry - a unit of work with rich context
• Devlog entries represent trackable work with AI-enhanced metadata and context
• Types: task, feature, bugfix, refactor, docs
• Statuses: new, in-progress, blocked, in-review, testing, done, cancelled  
• Priorities: low, medium, high, critical

FEATURES:
• Create, read, update, and manage devlog entries
• Rich context tracking (business context, technical context, notes)
• AI-friendly progress tracking and status workflows
• Project-based organization with multi-project support
• Duplicate detection and relationship management

This server provides 10 tools: 7 devlog operations + 3 project management tools.`,
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Initialize the adapter
let adapter: MCPAdapter;

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: allTools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Get handler for the tool
    const handler = toolHandlers[name as keyof typeof toolHandlers];

    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    // Execute the handler
    return await handler(adapter, args);
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
  const defaultProjectStr =
    projectArgIndex !== -1 && args[projectArgIndex + 1]
      ? args[projectArgIndex + 1]
      : process.env.MCP_DEFAULT_PROJECT || '1';

  // Convert to number, defaulting to 1 if invalid
  let defaultProjectId = 1;
  try {
    const parsed = parseInt(defaultProjectStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      defaultProjectId = parsed;
    }
  } catch {
    console.error(`Invalid project ID '${defaultProjectStr}', using default project 1`);
  }

  // Create adapter configuration
  const config: MCPAdapterConfig = {
    apiClient: {
      baseUrl: process.env.DEVLOG_BASE_URL || 'https://devlog.codervisor.dev',
      timeout: 30000,
      retries: 3,
    },
    defaultProjectId,
  };

  // Create and initialize adapter
  adapter = new MCPAdapter(config);
  await adapter.initialize();

  console.error(`Set current project to: ${defaultProjectId}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`Devlog MCP Server started with project: ${defaultProjectId}`);
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
