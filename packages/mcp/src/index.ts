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
      case 'list_devlogs': {
        const validation = validateToolArgs(ListDevlogsArgsSchema, args, 'list_devlogs');
        if (!validation.success) return validation.result;
        return await adapter.listDevlogs(validation.data);
      }

      case 'search_devlogs': {
        const validation = validateToolArgs(SearchDevlogsArgsSchema, args, 'search_devlogs');
        if (!validation.success) return validation.result;
        return await adapter.searchDevlogs(validation.data);
      }

      case 'discover_related_devlogs': {
        const validation = validateToolArgs(DiscoverRelatedDevlogsArgsSchema, args, 'discover_related_devlogs');
        if (!validation.success) return validation.result;
        return await adapter.discoverRelatedDevlogs(validation.data);
      }

      case 'create_devlog': {
        const validation = validateToolArgs(CreateDevlogArgsSchema, args, 'create_devlog');
        if (!validation.success) return validation.result;
        
        // Apply defaults
        const validatedArgs: CreateDevlogArgs = {
          ...validation.data,
          priority: validation.data.priority ?? 'medium',
        };
        
        return await adapter.createDevlog(validatedArgs);
      }

      case 'update_devlog': {
        const validation = validateToolArgs(UpdateDevlogArgsSchema, args, 'update_devlog');
        if (!validation.success) return validation.result;
        return await adapter.updateDevlog(validation.data);
      }

      case 'get_devlog': {
        const validation = validateToolArgs(GetDevlogArgsSchema, args, 'get_devlog');
        if (!validation.success) return validation.result;
        return await adapter.getDevlog(validation.data);
      }

      case 'add_devlog_note': {
        const validation = validateToolArgs(AddDevlogNoteArgsSchema, args, 'add_devlog_note');
        if (!validation.success) return validation.result;
        
        // Apply defaults
        const validatedArgs: AddDevlogNoteArgs = {
          ...validation.data,
          category: validation.data.category ?? 'progress',
        };
        
        return await adapter.addDevlogNote(validatedArgs);
      }

      case 'update_devlog_with_note': {
        const validation = validateToolArgs(UpdateDevlogWithNoteArgsSchema, args, 'update_devlog_with_note');
        if (!validation.success) return validation.result;
        
        // Apply defaults
        const validatedArgs: UpdateDevlogWithNoteArgs = {
          ...validation.data,
          category: validation.data.category ?? 'progress',
        };
        
        return await adapter.updateDevlogWithNote(validatedArgs);
      }

      case 'complete_devlog': {
        const validation = validateToolArgs(CompleteDevlogArgsSchema, args, 'complete_devlog');
        if (!validation.success) return validation.result;
        return await adapter.completeDevlog(validation.data);
      }

      case 'close_devlog': {
        const validation = validateToolArgs(CloseDevlogArgsSchema, args, 'close_devlog');
        if (!validation.success) return validation.result;
        return await adapter.closeDevlog(validation.data);
      }

      case 'archive_devlog': {
        const validation = validateToolArgs(ArchiveDevlogArgsSchema, args, 'archive_devlog');
        if (!validation.success) return validation.result;
        return await adapter.archiveDevlog(validation.data);
      }

      case 'unarchive_devlog': {
        const validation = validateToolArgs(ArchiveDevlogArgsSchema, args, 'unarchive_devlog');
        if (!validation.success) return validation.result;
        return await adapter.unarchiveDevlog(validation.data);
      }

      // Project management tools
      case 'list_projects':
        return await handleListProjects(adapter.manager);

      case 'get_current_project':
        return await handleGetCurrentProject(adapter);

      case 'switch_project': {
        const validation = validateToolArgs(SwitchProjectArgsSchema, args, 'switch_project');
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
