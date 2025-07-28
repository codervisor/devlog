import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { coreTools } from './core-tools.js';
import { searchTools } from './search-tools.js';
import { progressTools } from './progress-tools.js';
import { aiContextTools } from './ai-context-tools.js';
import { chatTools } from './chat-tools.js'; // Re-enabled with stub implementations
import { projectTools } from './project-tools.js';

/**
 * All available MCP tools organized by functionality
 */
export const allTools: Tool[] = [
  ...coreTools,
  ...searchTools,
  ...progressTools,
  ...aiContextTools,
  ...chatTools, // Re-enabled with stub implementations
  ...projectTools,
];

// Re-export individual tool groups for specific use cases
export { coreTools, searchTools, progressTools, aiContextTools, chatTools, projectTools };
