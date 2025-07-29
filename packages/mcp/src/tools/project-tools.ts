import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DevlogApiClient } from '../api/devlog-api-client.js';
import { zodToJsonSchema } from '../utils/schema-converter.js';
import {
  ListProjectsArgsSchema,
  GetCurrentProjectArgsSchema,
  SwitchProjectArgsSchema,
} from '../schemas/mcp-tool-schemas.js';

// Project management tools for MCP server
export const listProjectsTool: Tool = {
  name: 'project_list',
  description: 'List all available projects with their configurations',
  inputSchema: zodToJsonSchema(ListProjectsArgsSchema),
};

export const getCurrentProjectTool: Tool = {
  name: 'project_get_current',
  description: 'Get the currently active project information',
  inputSchema: zodToJsonSchema(GetCurrentProjectArgsSchema),
};

export const switchProjectTool: Tool = {
  name: 'project_switch',
  description: 'Switch to a different project by ID',
  inputSchema: zodToJsonSchema(SwitchProjectArgsSchema),
};

export const projectTools: Tool[] = [listProjectsTool, getCurrentProjectTool, switchProjectTool];

// Tool implementations for project management
export async function handleListProjects(apiClient: DevlogApiClient) {
  try {
    const projects = await apiClient.listProjects();

    if (projects.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No projects found.',
          },
        ],
      };
    }

    const projectsText = projects
      .map((project: any, index: number) => {
        return `${index + 1}. **${project.name}** (${project.id})
   Description: ${project.description || 'No description'}
   Created: ${new Date(project.createdAt).toLocaleDateString()}
   Updated: ${new Date(project.updatedAt).toLocaleDateString()}`;
      })
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${projects.length} projects:\n\n${projectsText}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error listing projects: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleGetCurrentProject(adapter: any) {
  try {
    const currentProjectId = adapter.getCurrentProjectId();
    const projects = await adapter.apiClient.listProjects();
    const currentProject = projects.find((p: any) => p.id === currentProjectId);

    if (!currentProject) {
      return {
        content: [
          {
            type: 'text',
            text: `Current project '${currentProjectId}' not found in available projects.`,
          },
        ],
        isError: true,
      };
    }

    const projectInfo = `Current Project: **${currentProject.name}**
ID: ${currentProject.id}
Description: ${currentProject.description || 'No description'}
Created: ${new Date(currentProject.createdAt).toLocaleDateString()}
Updated: ${new Date(currentProject.lastAccessedAt).toLocaleDateString()}

Note: This is the MCP server's in-memory current project. Web app project may differ.`;

    return {
      content: [
        {
          type: 'text',
          text: projectInfo,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting current project: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleSwitchProject(adapter: any, args: { projectId: string }) {
  try {
    // Validate that the project exists
    const projects = await adapter.apiClient.listProjects();
    const targetProject = projects.find((p: any) => p.id === args.projectId);

    if (!targetProject) {
      return {
        content: [
          {
            type: 'text',
            text: `Project '${args.projectId}' not found. Available projects: ${projects.map((p: any) => p.id).join(', ')}`,
          },
        ],
        isError: true,
      };
    }

    // Switch current project in memory only
    adapter.setCurrentProjectId(args.projectId);

    const switchInfo = `Successfully switched MCP server to project: **${targetProject.name}**
ID: ${targetProject.id}
Description: ${targetProject.description || 'No description'}
Created: ${new Date(targetProject.createdAt).toLocaleDateString()}
Updated: ${new Date(targetProject.lastAccessedAt).toLocaleDateString()}

Note: This only affects the MCP server's current project. Web app project is managed separately.`;

    return {
      content: [
        {
          type: 'text',
          text: switchInfo,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error switching to project '${args.projectId}': ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
