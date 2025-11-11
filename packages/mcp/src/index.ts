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
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  SetLevelRequestSchema,
  type LoggingLevel,
} from '@modelcontextprotocol/sdk/types.js';
import { MCPAdapter, type MCPAdapterConfig } from './adapters/index.js';
import { allTools } from './tools/index.js';
import { toolHandlers } from './handlers/tool-handlers.js';
import { ServerManager, logger } from './server/index.js';

const server = new Server(
  {
    name: 'devlog-mcp',
    version: '1.0.0',
    description: `AI Coding Agent Observability Platform - MCP Server

PRIMARY FEATURES - Agent Observability:
• Real-time monitoring of AI coding agent activities
• Session tracking with complete workflow visibility
• Performance metrics and quality analytics
• Event logging for debugging and compliance
• Supported agents: GitHub Copilot, Claude, Cursor, Gemini CLI, Cline, Aider, and more

Use agent_* tools for monitoring AI assistants:
• agent_start_session - Begin tracking an agent session
• agent_log_event - Record agent activities
• agent_query_events - Search and filter events
• agent_get_session_stats - Performance metrics

SUPPORTING FEATURES - Project Management:
• Optional work item tracking (features, bugs, tasks)
• Project organization for multi-codebase teams
• Document attachments and note-taking
• Status workflows and progress tracking

Work item tools (optional organization):
• create_devlog - Create a work item
• update_devlog - Update status and progress
• list_devlogs - Browse work items

Note: "devlog" is legacy terminology. Think of these as "work items" that optionally
organize agent sessions by planned development tasks.
`,
  },
  {
    capabilities: {
      tools: {},
      logging: {},
    },
  },
);

// Initialize the adapter
let adapter: MCPAdapter;

server.setRequestHandler(SetLevelRequestSchema, async (request) => {
  logger.setLoggingLevel(request.params.level);
  return { success: true, level: request.params.level };
});

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
      : process.env.DEVLOG_DEFAULT_PROJECT || '1';

  // Convert to number, defaulting to 1 if invalid
  let defaultProjectId = 1;
  try {
    const parsed = parseInt(defaultProjectStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      defaultProjectId = parsed;
    }
  } catch {
    logger.error(`Invalid project ID '${defaultProjectStr}', using default project 1`);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Register server with ServerManager for centralized logging
  const serverManager = ServerManager.getInstance();
  serverManager.setServer(server);

  // Create adapter configuration
  const config: MCPAdapterConfig = {
    apiClient: {
      baseUrl: process.env.DEVLOG_API_URL || 'https://devlog.codervisor.dev/api',
      timeout: 30000,
      retries: 3,
    },
    defaultProjectId,
  };

  // Create and initialize adapter
  adapter = new MCPAdapter(config);
  await adapter.initialize();

  logger.info(`Set current project to: ${defaultProjectId}`);
  logger.info(`Devlog MCP Server started with project: ${defaultProjectId}`);
}

// Cleanup on process exit
process.on('SIGINT', async () => {
  logger.info('Shutting down server...');
  await adapter.dispose();
  ServerManager.getInstance().dispose();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down server...');
  await adapter.dispose();
  ServerManager.getInstance().dispose();
  process.exit(0);
});

main().catch((error) => {
  logger.error('Failed to start MCP server:', error);
  process.exit(1);
});
