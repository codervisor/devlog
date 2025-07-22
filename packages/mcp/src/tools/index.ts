import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { coreTools } from './core-tools';
import { searchTools } from './search-tools';
import { progressTools } from './progress-tools';
import { aiContextTools } from './ai-context-tools';
import { chatTools } from './chat-tools';

/**
 * All available MCP tools organized by functionality
 */
export const allTools: Tool[] = [
  ...coreTools,
  ...searchTools,
  ...progressTools,
  ...aiContextTools,
  ...chatTools,
];

// Re-export individual tool groups for specific use cases
export { coreTools, searchTools, progressTools, aiContextTools, chatTools };
