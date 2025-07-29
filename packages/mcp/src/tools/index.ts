import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { devlogTools } from './devlog-tools.js';
import { projectTools } from './project-tools.js';

/**
 * All available MCP tools organized by functionality
 */
export const allTools: Tool[] = [...devlogTools, ...projectTools];

// Re-export individual tool groups for specific use cases
export { devlogTools, projectTools };

// Legacy exports for backward compatibility and test compatibility
export const coreTools = devlogTools.filter((tool) =>
  ['devlog_create', 'devlog_get', 'devlog_update', 'devlog_list', 'devlog_close'].includes(
    tool.name,
  ),
);

export const searchTools = devlogTools.filter((tool) =>
  ['devlog_search', 'devlog_discover_related'].includes(tool.name),
);

export const progressTools = devlogTools.filter((tool) =>
  [
    'devlog_add_note',
    'devlog_update_with_note',
    'devlog_complete',
    'devlog_archive',
    'devlog_unarchive',
  ].includes(tool.name),
);

export const aiContextTools: Tool[] = []; // Currently no AI context specific tools

export const chatTools: Tool[] = []; // Currently no chat specific tools

export const workspaceTools = projectTools; // Projects are the new workspaces
