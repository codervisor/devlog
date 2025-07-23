import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { coreTools } from './core-tools.js';
import { searchTools } from './search-tools.js';
import { progressTools } from './progress-tools.js';
import { aiContextTools } from './ai-context-tools.js';
// import { chatTools } from './chat-tools.js'; // Disabled - not implemented yet
import { workspaceTools } from './workspace-tools.js';

/**
 * All available MCP tools organized by functionality
 */
export const allTools: Tool[] = [
  ...coreTools,
  ...searchTools,
  ...progressTools,
  ...aiContextTools,
  // ...chatTools, // Disabled - not implemented yet
  ...workspaceTools,
];

// Re-export individual tool groups for specific use cases
export { coreTools, searchTools, progressTools, aiContextTools, /* chatTools, */ workspaceTools };
