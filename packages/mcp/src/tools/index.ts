import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { devlogTools } from './devlog-tools.js';
import { projectTools } from './project-tools.js';

/**
 * All available MCP tools - devlog-specific naming
 *
 * See server description for complete terminology and context.
 *
 * Total: 10 tools
 * - 7 devlog tools: create_devlog, get_devlog, update_devlog, list_devlogs,
 *   add_devlog_note, complete_devlog, find_related_devlogs
 * - 3 project tools: list_projects, get_current_project, switch_project
 */
export const allTools: Tool[] = [...devlogTools, ...projectTools];

// Re-export tool groups
export { devlogTools, projectTools };

// Simplified tool categories
export const coreTools = devlogTools.filter((tool) =>
  ['create_devlog', 'get_devlog', 'update_devlog', 'list_devlogs'].includes(tool.name),
);

export const actionTools = devlogTools.filter((tool) =>
  ['add_devlog_note', 'complete_devlog', 'find_related_devlogs'].includes(tool.name),
);

export const contextTools = projectTools; // Project tools provide AI agent context
