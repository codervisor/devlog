import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * AI context management and optimization operations
 */
export const aiContextTools: Tool[] = [
  {
    name: 'get_active_context',
    description: 'Get a summary of all active devlog entries for AI context',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          default: 10,
          description: 'Maximum number of entries to return',
        },
      },
    },
  },
  {
    name: 'get_context_for_ai',
    description: 'Get comprehensive AI-optimized context for a devlog entry',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Numeric ID of the devlog entry to get context for',
        },
      },
      required: ['id'],
    },
  },
];
