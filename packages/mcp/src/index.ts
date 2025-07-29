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
  AddDevlogNoteArgs,
  UpdateDevlogWithNoteArgs,
} from './types/index.js';
import { allTools } from './tools/index.js';
import {
  handleListProjects,
  handleGetCurrentProject,
  handleSwitchProject,
} from './tools/project-tools.js';
import { validateToolArgs } from './utils/validation.js';
import {
  CreateDevlogArgsSchema,
  UpdateDevlogArgsSchema,
  GetDevlogArgsSchema,
  ListDevlogsArgsSchema,
  SearchDevlogsArgsSchema,
  AddDevlogNoteArgsSchema,
  UpdateDevlogWithNoteArgsSchema,
  CompleteDevlogArgsSchema,
  CloseDevlogArgsSchema,
  ArchiveDevlogArgsSchema,
  DiscoverRelatedDevlogsArgsSchema,
  SwitchProjectArgsSchema,
} from './schemas/mcp-tool-schemas.js';

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
      case 'devlog_list': {
        const validation = validateToolArgs(ListDevlogsArgsSchema, args, 'devlog_list');
        if (!validation.success) return validation.result;
        return await adapter.listDevlogs(validation.data);
      }

      case 'devlog_search': {
        const validation = validateToolArgs(SearchDevlogsArgsSchema, args, 'devlog_search');
        if (!validation.success) return validation.result;
        return await adapter.searchDevlogs(validation.data);
      }

      case 'devlog_discover_related': {
        const validation = validateToolArgs(DiscoverRelatedDevlogsArgsSchema, args, 'devlog_discover_related');
        if (!validation.success) return validation.result;
        return await adapter.discoverRelatedDevlogs(validation.data);
      }

      case 'devlog_create': {
        const validation = validateToolArgs(CreateDevlogArgsSchema, args, 'devlog_create');
        if (!validation.success) return validation.result;
        
        // Apply defaults
        const validatedArgs: CreateDevlogArgs = {
          ...validation.data,
          priority: validation.data.priority ?? 'medium',
        };
        
        return await adapter.createDevlog(validatedArgs);
      }

      case 'devlog_update': {
        const validation = validateToolArgs(UpdateDevlogArgsSchema, args, 'devlog_update');
        if (!validation.success) return validation.result;
        return await adapter.updateDevlog(validation.data);
      }

      case 'devlog_get': {
        const validation = validateToolArgs(GetDevlogArgsSchema, args, 'devlog_get');
        if (!validation.success) return validation.result;
        return await adapter.getDevlog(validation.data);
      }

      case 'devlog_add_note': {
        const validation = validateToolArgs(AddDevlogNoteArgsSchema, args, 'devlog_add_note');
        if (!validation.success) return validation.result;
        
        // Apply defaults
        const validatedArgs: AddDevlogNoteArgs = {
          ...validation.data,
          category: validation.data.category ?? 'progress',
        };
        
        return await adapter.addDevlogNote(validatedArgs);
      }

      case 'devlog_update_with_note': {
        const validation = validateToolArgs(UpdateDevlogWithNoteArgsSchema, args, 'devlog_update_with_note');
        if (!validation.success) return validation.result;
        
        // Apply defaults
        const validatedArgs: UpdateDevlogWithNoteArgs = {
          ...validation.data,
          category: validation.data.category ?? 'progress',
        };
        
        return await adapter.updateDevlogWithNote(validatedArgs);
      }

      case 'devlog_complete': {
        const validation = validateToolArgs(CompleteDevlogArgsSchema, args, 'devlog_complete');
        if (!validation.success) return validation.result;
        return await adapter.completeDevlog(validation.data);
      }

      case 'devlog_close': {
        const validation = validateToolArgs(CloseDevlogArgsSchema, args, 'devlog_close');
        if (!validation.success) return validation.result;
        return await adapter.closeDevlog(validation.data);
      }

      case 'devlog_archive': {
        const validation = validateToolArgs(ArchiveDevlogArgsSchema, args, 'devlog_archive');
        if (!validation.success) return validation.result;
        return await adapter.archiveDevlog(validation.data);
      }

      case 'devlog_unarchive': {
        const validation = validateToolArgs(ArchiveDevlogArgsSchema, args, 'devlog_unarchive');
        if (!validation.success) return validation.result;
        return await adapter.unarchiveDevlog(validation.data);
      }

      // Project management tools
      case 'project_list':
        return await handleListProjects(adapter.manager);

      case 'project_get_current':
        return await handleGetCurrentProject(adapter);

      case 'project_switch': {
        const validation = validateToolArgs(SwitchProjectArgsSchema, args, 'project_switch');
        if (!validation.success) return validation.result;
        return await handleSwitchProject(adapter, validation.data);
      }

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

  // Create adapter using factory with discovery
  const adapterInstance = await createMCPAdapterWithDiscovery();

  // Set the default project ID
  if (adapterInstance.setCurrentProjectId) {
    adapterInstance.setCurrentProjectId(defaultProjectId);
    console.error(`Set current project to: ${defaultProjectId}`);
  }

  // Assign the adapter instance directly
  adapter = adapterInstance;

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
