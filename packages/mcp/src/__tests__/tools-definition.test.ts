import { describe, expect, it } from 'vitest';
import { allTools, coreTools, searchTools, progressTools, aiContextTools, chatTools, workspaceTools } from '../tools/index.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

describe('MCP Tools', () => {
  describe('tool definitions', () => {
    it('should export all tool categories', () => {
      expect(coreTools).toBeDefined();
      expect(searchTools).toBeDefined();
      expect(progressTools).toBeDefined();
      expect(aiContextTools).toBeDefined();
      expect(chatTools).toBeDefined();
      expect(workspaceTools).toBeDefined();
    });

    it('should have all tools in allTools array', () => {
      expect(allTools).toBeDefined();
      expect(Array.isArray(allTools)).toBe(true);
      expect(allTools.length).toBeGreaterThan(0);

      // Verify it contains tools from all categories
      const totalExpectedTools = 
        coreTools.length + 
        searchTools.length + 
        progressTools.length + 
        aiContextTools.length + 
        chatTools.length + 
        workspaceTools.length;

      expect(allTools.length).toBe(totalExpectedTools);
    });

    it('should have unique tool names', () => {
      const toolNames = allTools.map(tool => tool.name);
      const uniqueNames = new Set(toolNames);
      expect(uniqueNames.size).toBe(toolNames.length);
    });
  });

  describe('tool schema validation', () => {
    const validateTool = (tool: Tool) => {
      expect(tool.name, `Tool name should be defined`).toBeDefined();
      expect(typeof tool.name, `Tool name should be string`).toBe('string');
      expect(tool.name.length, `Tool name should not be empty`).toBeGreaterThan(0);

      expect(tool.description, `Tool ${tool.name} should have description`).toBeDefined();
      expect(typeof tool.description, `Tool ${tool.name} description should be string`).toBe('string');
      expect(tool.description?.length || 0, `Tool ${tool.name} description should not be empty`).toBeGreaterThan(0);

      expect(tool.inputSchema, `Tool ${tool.name} should have input schema`).toBeDefined();
      expect(tool.inputSchema.type, `Tool ${tool.name} input schema should be object type`).toBe('object');
      expect(tool.inputSchema.properties, `Tool ${tool.name} should have properties defined`).toBeDefined();
    };

    it('should validate core tools', () => {
      expect(coreTools.length).toBeGreaterThan(0);
      coreTools.forEach(validateTool);
    });

    it('should validate search tools', () => {
      expect(searchTools.length).toBeGreaterThan(0);
      searchTools.forEach(validateTool);
    });

    it('should validate progress tools', () => {
      expect(progressTools.length).toBeGreaterThan(0);
      progressTools.forEach(validateTool);
    });

    it('should validate AI context tools', () => {
      expect(aiContextTools.length).toBeGreaterThan(0);
      aiContextTools.forEach(validateTool);
    });

    it('should validate chat tools', () => {
      expect(chatTools.length).toBeGreaterThan(0);
      chatTools.forEach(validateTool);
    });

    it('should validate workspace tools', () => {
      expect(workspaceTools.length).toBeGreaterThan(0);
      workspaceTools.forEach(validateTool);
    });
  });

  describe('tool naming conventions', () => {
    it('should follow consistent naming convention', () => {
      // Tools use simple names without mcp_devlog_ prefix
      const expectedPatterns = [
        /^create_/,
        /^get_/,
        /^update_/,
        /^list_/,
        /^search_/,
        /^add_/,
        /^complete_/,
        /^close_/,
        /^archive_/,
        /^unarchive_/,
        /^discover_/,
        /^switch_/,
        /^import_/,
        /^link_/,
        /^unlink_/,
        /^suggest_/,
      ];
      
      // Each tool should match at least one expected pattern
      allTools.forEach(tool => {
        const matchesPattern = expectedPatterns.some(pattern => pattern.test(tool.name));
        expect(matchesPattern, `Tool '${tool.name}' should match expected naming patterns`).toBe(true);
      });
    });

    it('should have descriptive names', () => {
      const reservedWords = ['test', 'temp', 'debug', 'todo'];
      
      allTools.forEach(tool => {
        reservedWords.forEach(reserved => {
          expect(tool.name.toLowerCase()).not.toContain(reserved);
        });
      });
    });
  });

  describe('tool parameter validation', () => {
    it('should have required parameters properly defined', () => {
      allTools.forEach(tool => {
        if (tool.inputSchema.required && Array.isArray(tool.inputSchema.required)) {
          tool.inputSchema.required.forEach(requiredParam => {
            expect(tool.inputSchema.properties).toHaveProperty(requiredParam);
          });
        }
      });
    });

    it('should have proper parameter types', () => {
      const validTypes = ['string', 'number', 'boolean', 'array', 'object'];
      
      allTools.forEach(tool => {
        if (tool.inputSchema.properties) {
          Object.values(tool.inputSchema.properties).forEach((property: any) => {
            if (property.type) {
              expect(validTypes).toContain(property.type);
            }
          });
        }
      });
    });

    it('should have descriptions for all parameters', () => {
      allTools.forEach(tool => {
        if (tool.inputSchema.properties) {
          Object.entries(tool.inputSchema.properties).forEach(([paramName, property]: [string, any]) => {
            expect(property.description, 
              `Parameter '${paramName}' in tool '${tool.name}' should have description`
            ).toBeDefined();
            expect(property.description.length, 
              `Parameter '${paramName}' in tool '${tool.name}' description should not be empty`
            ).toBeGreaterThan(0);
          });
        }
      });
    });
  });

  describe('core tools specifics', () => {
    it('should have create_devlog tool', () => {
      const createTool = coreTools.find(tool => tool.name === 'create_devlog');
      expect(createTool).toBeDefined();
      expect(createTool!.inputSchema.required).toContain('title');
      expect(createTool!.inputSchema.required).toContain('type');
      expect(createTool!.inputSchema.required).toContain('description');
    });

    it('should have update_devlog tool', () => {
      const updateTool = coreTools.find(tool => tool.name === 'update_devlog');
      expect(updateTool).toBeDefined();
      expect(updateTool!.inputSchema.required).toContain('id');
    });

    it('should have list_devlogs tool', () => {
      const listTool = coreTools.find(tool => tool.name === 'list_devlogs');
      expect(listTool).toBeDefined();
    });

    it('should have get_devlog tool', () => {
      const getTool = coreTools.find(tool => tool.name === 'get_devlog');
      expect(getTool).toBeDefined();
      expect(getTool!.inputSchema.required).toContain('id');
    });
  });

  describe('search tools specifics', () => {
    it('should have search_devlogs tool', () => {
      const searchTool = searchTools.find(tool => tool.name === 'search_devlogs');
      expect(searchTool).toBeDefined();
      expect(searchTool!.inputSchema.required).toContain('query');
    });

    it('should have discover_related_devlogs tool', () => {
      const discoverTool = searchTools.find(tool => tool.name === 'discover_related_devlogs');
      expect(discoverTool).toBeDefined();
      expect(discoverTool!.inputSchema.required).toContain('workDescription');
      expect(discoverTool!.inputSchema.required).toContain('workType');
    });
  });

  describe('progress tools specifics', () => {
    it('should have add_devlog_note tool', () => {
      const addNoteTool = progressTools.find(tool => tool.name === 'add_devlog_note');
      expect(addNoteTool).toBeDefined();
      expect(addNoteTool!.inputSchema.required).toContain('id');
      expect(addNoteTool!.inputSchema.required).toContain('note');
    });

    it('should have complete_devlog tool', () => {
      const completeTool = progressTools.find(tool => tool.name === 'complete_devlog');
      expect(completeTool).toBeDefined();
      expect(completeTool!.inputSchema.required).toContain('id');
    });

    it('should have close_devlog tool', () => {
      const closeTool = coreTools.find(tool => tool.name === 'close_devlog');
      expect(closeTool).toBeDefined();
      expect(closeTool!.inputSchema.required).toContain('id');
    });
  });

  describe('workspace tools specifics', () => {
    it('should have list_workspaces tool', () => {
      const listWorkspacesTool = workspaceTools.find(tool => tool.name === 'list_workspaces');
      expect(listWorkspacesTool).toBeDefined();
    });

    it('should have get_current_workspace tool', () => {
      const getCurrentWorkspaceTool = workspaceTools.find(tool => tool.name === 'get_current_workspace');
      expect(getCurrentWorkspaceTool).toBeDefined();
    });

    it('should have switch_workspace tool', () => {
      const switchWorkspaceTool = workspaceTools.find(tool => tool.name === 'switch_workspace');
      expect(switchWorkspaceTool).toBeDefined();
      expect(switchWorkspaceTool!.inputSchema.required).toContain('workspaceId');
    });
  });

  describe('AI context tools specifics', () => {
    it('should have get_active_context tool', () => {
      const activeContextTool = aiContextTools.find(tool => tool.name === 'get_active_context');
      expect(activeContextTool).toBeDefined();
    });

    it('should have get_context_for_ai tool', () => {
      const contextForAiTool = aiContextTools.find(tool => tool.name === 'get_context_for_ai');
      expect(contextForAiTool).toBeDefined();
      expect(contextForAiTool!.inputSchema.required).toContain('id');
    });
  });
});
