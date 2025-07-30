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
      baseUrl: process.env.MCP_WEB_API_URL || 'http://localhost:3200',
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
