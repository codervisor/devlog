/**
 * Tool handlers using new simplified schemas and adapter
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { MCPAdapter } from '../adapters/index.js';
import {
  CreateDevlogSchema,
  GetDevlogSchema,
  UpdateDevlogSchema,
  ListDevlogSchema,
  AddNoteSchema,
  CompleteDevlogSchema,
  FindRelatedSchema,
  ListProjectsSchema,
  GetCurrentProjectSchema,
  SwitchProjectSchema,
  type CreateDevlogArgs,
  type GetDevlogArgs,
  type UpdateDevlogArgs,
  type ListDevlogArgs,
  type AddNoteArgs,
  type CompleteDevlogArgs,
  type FindRelatedArgs,
  type ListProjectsArgs,
  type GetCurrentProjectArgs,
  type SwitchProjectArgs,
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
 * Tool handlers mapping
 */
export const toolHandlers = {
  // Devlog operations
  create: (adapter: MCPAdapter, args: unknown) =>
    validateAndHandle<CreateDevlogArgs>(CreateDevlogSchema, args, 'create', (validArgs) =>
      adapter.create(validArgs),
    ),

  get: (adapter: MCPAdapter, args: unknown) =>
    validateAndHandle<GetDevlogArgs>(GetDevlogSchema, args, 'get', (validArgs) =>
      adapter.get(validArgs),
    ),

  update: (adapter: MCPAdapter, args: unknown) =>
    validateAndHandle<UpdateDevlogArgs>(UpdateDevlogSchema, args, 'update', (validArgs) =>
      adapter.update(validArgs),
    ),

  list: (adapter: MCPAdapter, args: unknown) =>
    validateAndHandle<ListDevlogArgs>(ListDevlogSchema, args, 'list', (validArgs) =>
      adapter.list(validArgs),
    ),

  add_note: (adapter: MCPAdapter, args: unknown) =>
    validateAndHandle<AddNoteArgs>(AddNoteSchema, args, 'add_note', (validArgs) =>
      adapter.addNote(validArgs),
    ),

  complete: (adapter: MCPAdapter, args: unknown) =>
    validateAndHandle<CompleteDevlogArgs>(CompleteDevlogSchema, args, 'complete', (validArgs) =>
      adapter.complete(validArgs),
    ),

  find_related: (adapter: MCPAdapter, args: unknown) =>
    validateAndHandle<FindRelatedArgs>(FindRelatedSchema, args, 'find_related', (validArgs) =>
      adapter.findRelated(validArgs),
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
