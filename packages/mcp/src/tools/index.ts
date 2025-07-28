import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { devlogTools } from './devlog-tools.js';
import { searchTools } from './search-tools.js';
import { aiContextTools } from './ai-context-tools.js';
import { projectTools } from './project-tools.js';

/**
 * All available MCP tools organized by functionality
 */
export const allTools: Tool[] = [
  ...devlogTools,
  ...searchTools,
  ...aiContextTools,
  ...projectTools,
];

// Re-export individual tool groups for specific use cases
export { devlogTools, searchTools, aiContextTools, projectTools };
