import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { devlogTools } from './devlog-tools.js';
import { projectTools } from './project-tools.js';
import { documentTools } from './document-tools.js';

/**
 * All available MCP tools - devlog-specific naming
 *
 * See server description for complete terminology and context.
 *
 * Total: 15 tools
 * - 7 devlog tools: create_devlog, get_devlog, update_devlog, list_devlogs,
 *   add_devlog_note, complete_devlog, find_related_devlogs
 * - 3 project tools: list_projects, get_current_project, switch_project
 * - 5 document tools: upload_devlog_document, list_devlog_documents, 
 *   get_devlog_document, delete_devlog_document, search_devlog_documents
 */
export const allTools: Tool[] = [...devlogTools, ...projectTools, ...documentTools];

// Re-export tool groups
export { devlogTools, projectTools, documentTools };

// Simplified tool categories
export const coreTools = devlogTools.filter((tool) =>
  ['create_devlog', 'get_devlog', 'update_devlog', 'list_devlogs'].includes(tool.name),
);

export const actionTools = devlogTools.filter((tool) =>
  ['add_devlog_note', 'complete_devlog', 'find_related_devlogs'].includes(tool.name),
);

export const contextTools = projectTools; // Project tools provide AI agent context

export const fileTools = documentTools; // Document tools for file management
