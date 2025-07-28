import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Core CRUD operations for devlog entries
 */
export const devlogTools: Tool[] = [
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
      },
      required: ['id'],
    },
  },
  {
    name: 'add_devlog_note',
    description: 'Add a timestamped note to an existing devlog entry',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Numeric ID of the devlog entry',
        },
        note: {
          type: 'string',
          description: 'Note content',
        },
        category: {
          type: 'string',
          enum: ['progress', 'issue', 'solution', 'idea', 'reminder', 'feedback'],
          default: 'progress',
          description: 'Category of the note',
        },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Files related to this note',
        },
        codeChanges: {
          type: 'string',
          description: 'Summary of code changes made',
        },
      },
      required: ['id', 'note'],
    },
  },
  {
    name: 'update_devlog_with_note',
    description: 'Update devlog status/fields and add a note in one operation',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Numeric ID of the devlog entry',
        },
        status: {
          type: 'string',
          enum: ['new', 'in-progress', 'in-review', 'blocked', 'testing', 'done', 'closed'],
          description: 'New status for the devlog entry',
        },
        note: {
          type: 'string',
          description: 'Note content to add',
        },
        category: {
          type: 'string',
          enum: ['progress', 'issue', 'solution', 'idea', 'reminder', 'feedback'],
          default: 'progress',
          description: 'Category of the note being added',
        },
        codeChanges: {
          type: 'string',
          description: 'Summary of code changes made',
        },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Files modified in this update',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Updated priority level',
        },
      },
      required: ['id', 'note'],
    },
  },
  {
    name: 'complete_devlog',
    description: 'Mark a devlog entry as completed and archive it',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Numeric ID of the devlog entry to complete',
        },
        summary: {
          type: 'string',
          description: 'Completion summary',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_devlogs',
    description: 'List all devlog entries with optional filtering and pagination',
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
        page: {
          type: 'number',
          description: 'Page number for pagination (1-based)',
          minimum: 1,
        },
        limit: {
          type: 'number',
          description: 'Number of items per page (default: 20)',
          minimum: 1,
          maximum: 100,
        },
        sortBy: {
          type: 'string',
          enum: ['createdAt', 'updatedAt', 'priority', 'status', 'title'],
          description: 'Field to sort by',
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort order (default: desc)',
        },
      },
    },
  },
  {
    name: 'close_devlog',
    description:
      'Close a devlog entry by setting status to cancelled. Safer alternative to deletion that preserves the entry.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Numeric ID of the devlog entry to close',
        },
        reason: {
          type: 'string',
          description:
            'Optional reason for closing the entry (e.g., "Test entry completed", "Duplicate work", "No longer needed")',
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
