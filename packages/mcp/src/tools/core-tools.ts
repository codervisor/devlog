import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Core CRUD operations for devlog entries
 */
export const coreTools: Tool[] = [
  {
    name: 'create_devlog',
    description: 'Create a new devlog entry for a task, feature, or bugfix with rich context',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the task/feature/bugfix',
        },
        type: {
          type: 'string',
          enum: ['feature', 'bugfix', 'task', 'refactor', 'docs'],
          description: 'Type of work being done',
        },
        description: {
          type: 'string',
          description: 'Detailed description of the work',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium',
          description: 'Priority level',
        },
        businessContext: {
          type: 'string',
          description: 'Business context - why this work matters and what problem it solves',
        },
        technicalContext: {
          type: 'string',
          description: 'Technical context - architecture decisions, constraints, assumptions',
        },
        acceptanceCriteria: {
          type: 'array',
          items: { type: 'string' },
          description: 'Acceptance criteria or definition of done',
        },
        initialInsights: {
          type: 'array',
          items: { type: 'string' },
          description: 'Initial insights or knowledge about this work',
        },
        relatedPatterns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Related patterns or examples from other projects',
        },
      },
      required: ['title', 'type', 'description'],
    },
  },
  {
    name: 'get_devlog',
    description: 'Get detailed information about a specific devlog entry',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Numeric ID of the devlog entry to retrieve',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_devlog',
    description: 'Update an existing devlog entry with progress, notes, or status changes',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Numeric ID of the devlog entry to update',
        },
        status: {
          type: 'string',
          enum: ['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'],
          description: 'Current status of the task',
        },
        blockers: {
          type: 'string',
          description: 'Any blockers or issues encountered',
        },
        nextSteps: {
          type: 'string',
          description: 'Next steps to take',
        },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of files that were modified',
        },
        businessContext: {
          type: 'string',
          description: 'Business context - why this work matters and what problem it solves',
        },
        technicalContext: {
          type: 'string',
          description: 'Technical context - architecture decisions, constraints, assumptions',
        },
        acceptanceCriteria: {
          type: 'array',
          items: { type: 'string' },
          description: 'Acceptance criteria or definition of done',
        },
        initialInsights: {
          type: 'array',
          items: { type: 'string' },
          description: 'Initial insights or knowledge about this work',
        },
        relatedPatterns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Related patterns or examples from other projects',
        },
        // AI context fields (embedded from update_ai_context)
        currentSummary: {
          type: 'string',
          description: 'Updated summary of current understanding',
        },
        keyInsights: {
          type: 'array',
          items: { type: 'string' },
          description: 'Key insights or learnings',
        },
        openQuestions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Open questions that need resolution',
        },
        suggestedNextSteps: {
          type: 'array',
          items: { type: 'string' },
          description: 'Suggested next steps based on current progress',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_devlogs',
    description: 'List all devlog entries with optional filtering',
    inputSchema: {
      type: 'object',
      properties: {
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
    },
  },
  {
    name: 'close_devlog',
    description: 'Close a devlog entry by setting status to cancelled. Safer alternative to deletion that preserves the entry.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Numeric ID of the devlog entry to close',
        },
        reason: {
          type: 'string',
          description: 'Optional reason for closing the entry (e.g., "Test entry completed", "Duplicate work", "No longer needed")',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'archive_devlog',
    description: 'Archive a devlog entry to reduce clutter in default views while preserving it.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Numeric ID of the devlog entry to archive',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'unarchive_devlog',
    description: 'Unarchive a devlog entry to restore it to default views.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Numeric ID of the devlog entry to unarchive',
        },
      },
      required: ['id'],
    },
  },
];
