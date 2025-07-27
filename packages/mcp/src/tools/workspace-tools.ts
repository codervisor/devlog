import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { WorkspaceDevlogManager } from '@codervisor/devlog-core';

// Workspace management tools for MCP server
export const listWorkspacesTool: Tool = {
  name: 'list_workspaces',
  description: 'List all available workspaces with their configurations',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export const getCurrentWorkspaceTool: Tool = {
  name: 'get_current_workspace',
  description: 'Get the currently active workspace information',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export const switchWorkspaceTool: Tool = {
  name: 'switch_workspace',
  description: 'Switch to a different workspace by ID',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceId: {
        type: 'string',
        description: 'The ID of the workspace to switch to',
      },
    },
    required: ['workspaceId'],
  },
};

export const workspaceTools: Tool[] = [
  listWorkspacesTool,
  getCurrentWorkspaceTool,
  switchWorkspaceTool,
];

// Tool implementations for workspace management
export async function handleListWorkspaces(workspaceManager: WorkspaceDevlogManager) {
  try {
    const workspaces = await workspaceManager.listWorkspaces();

    if (workspaces.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No workspaces found.',
          },
        ],
      };
    }

    const workspacesText = workspaces
      .map((workspace: any, index: number) => {
        return `${index + 1}. **${workspace.name}** (${workspace.id})
   Description: ${workspace.description || 'No description'}
   Created: ${new Date(workspace.createdAt).toLocaleDateString()}
   Last Accessed: ${new Date(workspace.lastAccessedAt).toLocaleDateString()}`;
      })
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${workspaces.length} workspaces:\n\n${workspacesText}`,
        },
      ],
    };
  } catch (error: unknown) {
    return {
      content: [
        {
          type: 'text',
          text: `Error listing workspaces: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleGetCurrentWorkspace(adapter: any) {
  try {
    const currentWorkspaceId = adapter.getCurrentWorkspaceId();
    const workspaces = await adapter.manager.listWorkspaces();
    const currentWorkspace = workspaces.find((ws: any) => ws.id === currentWorkspaceId);

    if (!currentWorkspace) {
      return {
        content: [
          {
            type: 'text',
            text: `Current workspace '${currentWorkspaceId}' not found in available workspaces.`,
          },
        ],
        isError: true,
      };
    }

    const workspaceInfo = `Current Workspace: **${currentWorkspace.name}**
ID: ${currentWorkspace.id}
Description: ${currentWorkspace.description || 'No description'}
Created: ${new Date(currentWorkspace.createdAt).toLocaleDateString()}
Last Accessed: ${new Date(currentWorkspace.lastAccessedAt).toLocaleDateString()}

Note: This is the MCP server's in-memory current workspace. Web app workspace may differ.`;

    return {
      content: [
        {
          type: 'text',
          text: workspaceInfo,
        },
      ],
    };
  } catch (error: unknown) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting current workspace: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

export async function handleSwitchWorkspace(adapter: any, args: { workspaceId: string }) {
  try {
    // Validate that the workspace exists
    const workspaces = await adapter.manager.listWorkspaces();
    const targetWorkspace = workspaces.find((ws: any) => ws.id === args.workspaceId);

    if (!targetWorkspace) {
      return {
        content: [
          {
            type: 'text',
            text: `Workspace '${args.workspaceId}' not found. Available workspaces: ${workspaces.map((ws: any) => ws.id).join(', ')}`,
          },
        ],
        isError: true,
      };
    }

    // Switch current workspace in memory only
    adapter.setCurrentWorkspaceId(args.workspaceId);

    const switchInfo = `Successfully switched MCP server to workspace: **${targetWorkspace.name}**
ID: ${targetWorkspace.id}
Description: ${targetWorkspace.description || 'No description'}
Created: ${new Date(targetWorkspace.createdAt).toLocaleDateString()}
Last Accessed: ${new Date(targetWorkspace.lastAccessedAt).toLocaleDateString()}

Note: This only affects the MCP server's current workspace. Web app workspace is managed separately.`;

    return {
      content: [
        {
          type: 'text',
          text: switchInfo,
        },
      ],
    };
  } catch (error: unknown) {
    return {
      content: [
        {
          type: 'text',
          text: `Error switching to workspace '${args.workspaceId}': ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
