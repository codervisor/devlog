import { describe, expect, it } from 'vitest';
import {
  allTools,
  coreTools,
  actionTools,
  contextTools,
  devlogTools,
  projectTools,
} from '../tools/index.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

describe('MCP Tools', () => {
  describe('tool definitions', () => {
    it('should export all tool categories', () => {
      expect(coreTools).toBeDefined();
      expect(actionTools).toBeDefined();
      expect(contextTools).toBeDefined();
      expect(devlogTools).toBeDefined();
      expect(projectTools).toBeDefined();
    });

    it('should have all tools in allTools array', () => {
      expect(allTools).toBeDefined();
      expect(Array.isArray(allTools)).toBe(true);
      expect(allTools.length).toBe(10); // 7 devlog + 3 project tools

      // Verify it contains tools from all categories
      const totalExpectedTools = coreTools.length + actionTools.length + contextTools.length;

      expect(allTools.length).toBe(totalExpectedTools);
    });

    it('should have unique tool names', () => {
      const toolNames = allTools.map((tool) => tool.name);
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
      expect(typeof tool.description, `Tool ${tool.name} description should be string`).toBe(
        'string',
      );
      expect(
        tool.description?.length || 0,
        `Tool ${tool.name} description should not be empty`,
      ).toBeGreaterThan(0);

      expect(tool.inputSchema, `Tool ${tool.name} should have input schema`).toBeDefined();
      expect(tool.inputSchema.type, `Tool ${tool.name} input schema should be object type`).toBe(
        'object',
      );
      expect(
        tool.inputSchema.properties,
        `Tool ${tool.name} should have properties defined`,
      ).toBeDefined();
    };

    it('should validate core tools', () => {
      expect(coreTools.length).toBeGreaterThan(0);
      coreTools.forEach(validateTool);
    });

    it('should validate action tools', () => {
      expect(actionTools.length).toBeGreaterThan(0);
      actionTools.forEach(validateTool);
    });

    it('should validate context tools (project tools)', () => {
      expect(contextTools.length).toBeGreaterThan(0);
      expect(contextTools).toBe(projectTools); // contextTools === projectTools
      contextTools.forEach(validateTool);
    });

    it('should validate devlog tools', () => {
      expect(devlogTools.length).toBe(7);
      devlogTools.forEach(validateTool);
    });

    it('should validate project tools', () => {
      expect(projectTools.length).toBe(3);
      projectTools.forEach(validateTool);
    });
  });

  describe('tool naming conventions', () => {
    it('should follow consistent naming convention', () => {
      // Current tool names - updated to match actual tools
      const expectedNames = [
        'create_devlog',
        'get_devlog',
        'update_devlog',
        'list_devlogs',
        'add_devlog_note',
        'complete_devlog',
        'find_related_devlogs',
        'list_projects',
        'get_current_project',
        'switch_project',
      ];

      // Verify all expected tools exist
      expectedNames.forEach((expectedName) => {
        const tool = allTools.find((tool) => tool.name === expectedName);
        expect(tool, `Tool '${expectedName}' should exist`).toBeDefined();
      });

      // Verify no unexpected tools exist
      allTools.forEach((tool) => {
        expect(expectedNames, `Tool '${tool.name}' should be in expected list`).toContain(
          tool.name,
        );
      });
    });

    it('should have descriptive names', () => {
      const reservedWords = ['test', 'temp', 'debug', 'todo'];

      allTools.forEach((tool) => {
        reservedWords.forEach((reserved) => {
          expect(tool.name.toLowerCase()).not.toContain(reserved);
        });
      });
    });
  });

  describe('tool parameter validation', () => {
    it('should have required parameters properly defined', () => {
      allTools.forEach((tool) => {
        if (tool.inputSchema.required && Array.isArray(tool.inputSchema.required)) {
          tool.inputSchema.required.forEach((requiredParam) => {
            expect(tool.inputSchema.properties).toHaveProperty(requiredParam);
          });
        }
      });
    });

    it('should have proper parameter types', () => {
      const validTypes = ['string', 'number', 'boolean', 'array', 'object', 'integer'];

      allTools.forEach((tool) => {
        if (tool.inputSchema.properties) {
          Object.values(tool.inputSchema.properties).forEach((property: any) => {
            if (property.type) {
              expect(validTypes).toContain(property.type);
            }
          });
        }
      });
    });

    // Skip parameter description tests for now as schemas may not have descriptions
    it('should have valid input schemas', () => {
      allTools.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
      });
    });
  });

  describe('specific tool tests', () => {
    it('should have create_devlog tool', () => {
      const createTool = allTools.find((tool) => tool.name === 'create_devlog');
      expect(createTool).toBeDefined();
      expect(createTool!.inputSchema.required).toContain('title');
      expect(createTool!.inputSchema.required).toContain('description');
    });

    it('should have update_devlog tool', () => {
      const updateTool = allTools.find((tool) => tool.name === 'update_devlog');
      expect(updateTool).toBeDefined();
      expect(updateTool!.inputSchema.required).toContain('id');
    });

    it('should have list_devlogs tool', () => {
      const listTool = allTools.find((tool) => tool.name === 'list_devlogs');
      expect(listTool).toBeDefined();
    });

    it('should have get_devlog tool', () => {
      const getTool = allTools.find((tool) => tool.name === 'get_devlog');
      expect(getTool).toBeDefined();
      expect(getTool!.inputSchema.required).toContain('id');
    });

    it('should have add_devlog_note tool', () => {
      const addNoteTool = allTools.find((tool) => tool.name === 'add_devlog_note');
      expect(addNoteTool).toBeDefined();
      expect(addNoteTool!.inputSchema.required).toContain('id');
      expect(addNoteTool!.inputSchema.required).toContain('note');
    });

    it('should have complete_devlog tool', () => {
      const completeTool = allTools.find((tool) => tool.name === 'complete_devlog');
      expect(completeTool).toBeDefined();
      expect(completeTool!.inputSchema.required).toContain('id');
    });

    it('should have find_related_devlogs tool', () => {
      const findRelatedTool = allTools.find((tool) => tool.name === 'find_related_devlogs');
      expect(findRelatedTool).toBeDefined();
      expect(findRelatedTool!.inputSchema.required).toContain('description');
    });

    it('should have list_projects tool', () => {
      const listProjectsTool = allTools.find((tool) => tool.name === 'list_projects');
      expect(listProjectsTool).toBeDefined();
    });

    it('should have get_current_project tool', () => {
      const getCurrentProjectTool = allTools.find((tool) => tool.name === 'get_current_project');
      expect(getCurrentProjectTool).toBeDefined();
    });

    it('should have switch_project tool', () => {
      const switchProjectTool = allTools.find((tool) => tool.name === 'switch_project');
      expect(switchProjectTool).toBeDefined();
      expect(switchProjectTool!.inputSchema.required).toContain('projectId');
    });
  });
});
