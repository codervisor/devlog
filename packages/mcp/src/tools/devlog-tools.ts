import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from '../utils/schema-converter.js';
import {
  CreateDevlogArgsSchema,
  UpdateDevlogArgsSchema,
  GetDevlogArgsSchema,
  ListDevlogsArgsSchema,
  SearchDevlogsArgsSchema,
  AddDevlogNoteArgsSchema,
  UpdateDevlogWithNoteArgsSchema,
  CompleteDevlogArgsSchema,
  CloseDevlogArgsSchema,
  ArchiveDevlogArgsSchema,
  DiscoverRelatedDevlogsArgsSchema,
} from '../schemas/mcp-tool-schemas.js';

/**
 * Core CRUD operations for devlog entries
 */
export const devlogTools: Tool[] = [
  {
    name: 'devlog_create',
    description: 'Create a new devlog entry for a task, feature, or bugfix with rich context',
    inputSchema: zodToJsonSchema(CreateDevlogArgsSchema),
  },
  {
    name: 'devlog_get',
    description: 'Get detailed information about a specific devlog entry',
    inputSchema: zodToJsonSchema(GetDevlogArgsSchema),
  },
  {
    name: 'devlog_update',
    description: 'Update an existing devlog entry with progress, notes, or status changes',
    inputSchema: zodToJsonSchema(UpdateDevlogArgsSchema),
  },
  {
    name: 'devlog_add_note',
    description: 'Add a timestamped note to an existing devlog entry',
    inputSchema: zodToJsonSchema(AddDevlogNoteArgsSchema),
  },
  {
    name: 'devlog_update_with_note',
    description: 'Update devlog status/fields and add a note in one operation',
    inputSchema: zodToJsonSchema(UpdateDevlogWithNoteArgsSchema),
  },
  {
    name: 'devlog_complete',
    description: 'Mark a devlog entry as completed and archive it',
    inputSchema: zodToJsonSchema(CompleteDevlogArgsSchema),
  },
  {
    name: 'devlog_list',
    description: 'List all devlog entries with optional filtering and pagination',
    inputSchema: zodToJsonSchema(ListDevlogsArgsSchema),
  },
  {
    name: 'devlog_close',
    description:
      'Close a devlog entry by setting status to cancelled. Safer alternative to deletion that preserves the entry.',
    inputSchema: zodToJsonSchema(CloseDevlogArgsSchema),
  },
  {
    name: 'devlog_archive',
    description: 'Archive a devlog entry to reduce clutter in default views while preserving it.',
    inputSchema: zodToJsonSchema(ArchiveDevlogArgsSchema),
  },
  {
    name: 'devlog_unarchive',
    description: 'Unarchive a devlog entry to restore it to default views.',
    inputSchema: zodToJsonSchema(ArchiveDevlogArgsSchema),
  },

  {
    name: 'devlog_discover_related',
    description:
      'Comprehensively search for existing devlog entries related to planned work before creating new entries. Returns detailed analysis of relevant historical context to prevent duplicate work.',
    inputSchema: zodToJsonSchema(DiscoverRelatedDevlogsArgsSchema),
  },
  {
    name: 'devlog_search',
    description: 'Search devlog entries by keywords in title, description, or notes',
    inputSchema: zodToJsonSchema(SearchDevlogsArgsSchema),
  },
];
