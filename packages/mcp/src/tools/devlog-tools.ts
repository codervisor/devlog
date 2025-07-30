import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from '../utils/schema-converter.js';
import {
  CreateDevlogSchema,
  GetDevlogSchema,
  UpdateDevlogSchema,
  ListDevlogSchema,
  AddNoteSchema,
  CompleteDevlogSchema,
  FindRelatedSchema,
} from '../schemas/index.js';

/**
 * Simplified devlog tools with AI-friendly design
 * - Clear action-based naming (create, get, update, list, etc.)
 * - Minimal required parameters with smart defaults
 * - Consistent response formats via Zod schemas
 * - Reduced cognitive load for AI agents
 */
export const devlogTools: Tool[] = [
  {
    name: 'create',
    description: 'Create a new task, feature, or bug entry',
    inputSchema: zodToJsonSchema(CreateDevlogSchema),
  },

  {
    name: 'get',
    description: 'Get detailed information about a specific entry',
    inputSchema: zodToJsonSchema(GetDevlogSchema),
  },

  {
    name: 'update',
    description: 'Update entry status, priority, or add progress notes',
    inputSchema: zodToJsonSchema(UpdateDevlogSchema),
  },

  {
    name: 'list',
    description: 'List and search entries with optional filtering',
    inputSchema: zodToJsonSchema(ListDevlogSchema),
  },

  {
    name: 'add_note',
    description: 'Add a timestamped progress note to an entry',
    inputSchema: zodToJsonSchema(AddNoteSchema),
  },

  {
    name: 'complete',
    description: 'Mark entry as completed (automatically archives)',
    inputSchema: zodToJsonSchema(CompleteDevlogSchema),
  },

  {
    name: 'find_related',
    description: 'Find existing entries related to planned work (prevents duplicates)',
    inputSchema: zodToJsonSchema(FindRelatedSchema),
  },
];
