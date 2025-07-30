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
 * Devlog tools with clear naming and AI-friendly design
 *
 * See server description for complete terminology and context.
 *
 * DESIGN PRINCIPLES:
 * - Clear devlog-specific naming (create_devlog, get_devlog, etc.)
 * - Minimal required parameters with smart defaults
 * - Consistent response formats via Zod schemas
 * - Reduced cognitive load for AI agents
 */
export const devlogTools: Tool[] = [
  {
    name: 'create_devlog',
    description: 'Create a new task, feature, or bug entry',
    inputSchema: zodToJsonSchema(CreateDevlogSchema),
  },

  {
    name: 'get_devlog',
    description: 'Get detailed information about a specific entry',
    inputSchema: zodToJsonSchema(GetDevlogSchema),
  },

  {
    name: 'update_devlog',
    description: 'Update entry status, priority, or add progress notes',
    inputSchema: zodToJsonSchema(UpdateDevlogSchema),
  },

  {
    name: 'list_devlogs',
    description: 'List and search entries with optional filtering',
    inputSchema: zodToJsonSchema(ListDevlogSchema),
  },

  {
    name: 'add_devlog_note',
    description: 'Add a timestamped progress note to an entry',
    inputSchema: zodToJsonSchema(AddNoteSchema),
  },

  {
    name: 'complete_devlog',
    description: 'Mark entry as completed (automatically archives)',
    inputSchema: zodToJsonSchema(CompleteDevlogSchema),
  },

  {
    name: 'find_related_devlogs',
    description: 'Find existing entries related to planned work (prevents duplicates)',
    inputSchema: zodToJsonSchema(FindRelatedSchema),
  },
];
