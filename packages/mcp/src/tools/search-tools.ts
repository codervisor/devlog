import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Search and discovery operations for devlog entries
 */
export const searchTools: Tool[] = [
  {
    name: 'discover_related_devlogs',
    description:
      'Comprehensively search for existing devlog entries related to planned work before creating new entries. Returns detailed analysis of relevant historical context to prevent duplicate work.',
    inputSchema: {
      type: 'object',
      properties: {
        workDescription: {
          type: 'string',
          description: 'Detailed description of the work you plan to do',
        },
        workType: {
          type: 'string',
          enum: ['feature', 'bugfix', 'task', 'refactor', 'docs'],
          description: 'Type of work being planned',
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Key terms, technologies, components, or concepts involved in the work',
        },
        scope: {
          type: 'string',
          description: 'Scope or area of the codebase this work affects',
        },
      },
      required: ['workDescription', 'workType'],
    },
  },
  {
    name: 'search_devlogs',
    description: 'Search devlog entries by keywords in title, description, or notes',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        status: {
          type: 'string',
          enum: ['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'closed'],
          description: 'Filter by status',
        },
        type: {
          type: 'string',
          enum: ['feature', 'bugfix', 'task', 'refactor', 'docs'],
          description: 'Filter by type',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Filter by priority',
        },
      },
      required: ['query'],
    },
  },
];
