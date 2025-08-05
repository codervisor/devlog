/**
 * Tool handlers using new simplified schemas and adapter
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { MCPAdapter } from '../adapters/index.js';
import {
  type AddDevlogNoteArgs,
  AddDevlogNoteSchema,
  type CreateDevlogArgs,
  CreateDevlogSchema,
  type FindRelatedDevlogsArgs,
  FindRelatedDevlogsSchema,
  type GetCurrentProjectArgs,
  GetCurrentProjectSchema,
  type GetDevlogArgs,
  GetDevlogSchema,
  type ListDevlogArgs,
  ListDevlogNotesArgs,
  ListDevlogNotesSchema,
  ListDevlogSchema,
  type ListProjectsArgs,
  ListProjectsSchema,
  type SwitchProjectArgs,
  SwitchProjectSchema,
  type UpdateDevlogArgs,
  UpdateDevlogSchema,
} from '../schemas/index.js';

/**
 * Validate and handle tool arguments using Zod schemas
 */
async function validateAndHandle<T>(
  schema: any,
  args: unknown,
  toolName: string,
  handler: (validArgs: T) => Promise<CallToolResult>,
): Promise<CallToolResult> {
  try {
    const validArgs = schema.parse(args) as T;
    return await handler(validArgs);
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Validation error for ${toolName}: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Tool handlers mapping with devlog-specific naming
 */
export const toolHandlers = {
  // Devlog operations
  create_devlog: (adapter: MCPAdapter, args: unknown) =>
    validateAndHandle<CreateDevlogArgs>(CreateDevlogSchema, args, 'create_devlog', (validArgs) =>
      adapter.createDevlog(validArgs),
    ),

  get_devlog: (adapter: MCPAdapter, args: unknown) =>
    validateAndHandle<GetDevlogArgs>(GetDevlogSchema, args, 'get_devlog', (validArgs) =>
      adapter.getDevlog(validArgs),
    ),

  update_devlog: (adapter: MCPAdapter, args: unknown) =>
    validateAndHandle<UpdateDevlogArgs>(UpdateDevlogSchema, args, 'update_devlog', (validArgs) =>
      adapter.updateDevlog(validArgs),
    ),

  list_devlogs: (adapter: MCPAdapter, args: unknown) =>
    validateAndHandle<ListDevlogArgs>(ListDevlogSchema, args, 'list_devlogs', (validArgs) =>
      adapter.listDevlogs(validArgs),
    ),

  find_related_devlogs: (adapter: MCPAdapter, args: unknown) =>
    validateAndHandle<FindRelatedDevlogsArgs>(
      FindRelatedDevlogsSchema,
      args,
      'find_related_devlogs',
      (validArgs) => adapter.findRelatedDevlogs(validArgs),
    ),

  add_devlog_note: (adapter: MCPAdapter, args: unknown) =>
    validateAndHandle<AddDevlogNoteArgs>(
      AddDevlogNoteSchema,
      args,
      'add_devlog_note',
      (validArgs) => adapter.addDevlogNote(validArgs),
    ),

  list_devlog_notes: (adapter: MCPAdapter, args: unknown) =>
    validateAndHandle<ListDevlogNotesArgs>(
      ListDevlogNotesSchema,
      args,
      'list_devlog_notes',
      (validArgs) => adapter.listDevlogNotes(validArgs),
    ),

  // Project operations
  list_projects: (adapter: MCPAdapter, args: unknown) =>
    validateAndHandle<ListProjectsArgs>(ListProjectsSchema, args, 'list_projects', (validArgs) =>
      adapter.listProjects(validArgs),
    ),

  get_current_project: (adapter: MCPAdapter, args: unknown) =>
    validateAndHandle<GetCurrentProjectArgs>(
      GetCurrentProjectSchema,
      args,
      'get_current_project',
      (validArgs) => adapter.getCurrentProject(validArgs),
    ),

  switch_project: (adapter: MCPAdapter, args: unknown) =>
    validateAndHandle<SwitchProjectArgs>(SwitchProjectSchema, args, 'switch_project', (validArgs) =>
      adapter.switchProject(validArgs),
    ),
};
