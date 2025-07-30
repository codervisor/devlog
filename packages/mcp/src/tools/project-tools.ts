import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from '../utils/schema-converter.js';
import {
  ListProjectsSchema,
  GetCurrentProjectSchema,
  SwitchProjectSchema,
} from '../schemas/index.js';

// Project management tools for MCP server
export const listProjectsTool: Tool = {
  name: 'list_projects',
  description: 'List all projects the AI agent can access',
  inputSchema: zodToJsonSchema(ListProjectsSchema),
};

export const getCurrentProjectTool: Tool = {
  name: 'get_current_project',
  description: 'Get information about the currently active project',
  inputSchema: zodToJsonSchema(GetCurrentProjectSchema),
};

export const switchProjectTool: Tool = {
  name: 'switch_project',
  description: 'Switch to a different project context',
  inputSchema: zodToJsonSchema(SwitchProjectSchema),
};

export const projectTools: Tool[] = [listProjectsTool, getCurrentProjectTool, switchProjectTool];
