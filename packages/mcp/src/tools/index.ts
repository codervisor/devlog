import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { devlogTools } from './devlog-tools.js';
import { projectTools } from './project-tools.js';

/**
 * All available MCP tools - simplified and AI-friendly
 *
 * Total: 10 tools (down from 15)
 * - 7 devlog tools: create, get, update, list, add_note, complete, find_related
 * - 3 project tools: list_projects, get_current_project, switch_project
 */
export const allTools: Tool[] = [...devlogTools, ...projectTools];

// Re-export tool groups
export { devlogTools, projectTools };

// Simplified tool categories
export const coreTools = devlogTools.filter((tool) =>
  ['create', 'get', 'update', 'list'].includes(tool.name),
);

export const actionTools = devlogTools.filter((tool) =>
  ['add_note', 'complete', 'find_related'].includes(tool.name),
);

export const contextTools = projectTools; // Project tools provide AI agent context
