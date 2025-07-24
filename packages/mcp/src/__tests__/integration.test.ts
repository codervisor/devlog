import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WorkspaceDevlogManager } from '@devlog/core';
import { MCPDevlogAdapter } from '../adapters/mcp-adapter.js';
import { allTools } from '../tools/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('MCP Server Integration', () => {
  let testWorkspace: string;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(async () => {
    // Store original environment and working directory
    originalCwd = process.cwd();
    originalEnv = { ...process.env };

    // Create test workspace with unique timestamp to avoid conflicts
    testWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-integration-test-'));

    // Change to test workspace
    process.chdir(testWorkspace);

    // Set up environment variables for testing instead of config file
    process.env.DEVLOG_JSON_DIRECTORY = '.devlog-test';
    process.env.DEVLOG_JSON_GLOBAL = 'false';

    // Create minimal package.json to make directory detectable as project root
    const packageJson = {
      name: 'mcp-integration-test',
      version: '1.0.0',
      private: true,
    };
    await fs.writeFile(
      path.join(testWorkspace, 'package.json'),
      JSON.stringify(packageJson, null, 2),
    );
  });

  afterAll(async () => {
    // Restore original environment and working directory
    process.env = originalEnv;
    process.chdir(originalCwd);

    // Clean up test workspace
    try {
      await fs.rm(testWorkspace, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Failed to clean up test workspace:', error);
    }
  });

  it('should create MCP server instance', () => {
    const server = new Server(
      {
        name: 'devlog-mcp-test',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    expect(server).toBeDefined();
  });

  it('should handle stdio transport creation', () => {
    const transport = new StdioServerTransport();
    expect(transport).toBeDefined();
  });

  it('should initialize MCPDevlogAdapter successfully', async () => {
    const adapter = new MCPDevlogAdapter();
    expect(adapter).toBeDefined();

    // Clean up
    await adapter.dispose();
  });

  it('should initialize WorkspaceDevlogManager successfully', async () => {
    const workspaceManager = new WorkspaceDevlogManager({
      fallbackToEnvConfig: true,
      createWorkspaceConfigIfMissing: true,
    });
    await workspaceManager.initialize();
    expect(workspaceManager).toBeDefined();

    // Test basic functionality
    const result = await workspaceManager.listDevlogs({});
    expect(result).toBeDefined();
    expect(result.items).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);

    // Clean up
    await workspaceManager.cleanup();
  });

  it('should perform basic CRUD operations', async () => {
    const workspaceManager = new WorkspaceDevlogManager({
      fallbackToEnvConfig: true,
      createWorkspaceConfigIfMissing: true,
    });
    await workspaceManager.initialize();

    try {
      // Create a test devlog
      const testDevlog = await workspaceManager.createDevlog({
        title: 'Integration Test Entry',
        type: 'task',
        description: 'Test entry created during integration testing',
        businessContext: 'Testing MCP server functionality',
        technicalContext: 'CI/CD pipeline validation',
      });

      expect(testDevlog).toBeDefined();
      expect(testDevlog.title).toBe('Integration Test Entry');
      expect(testDevlog.type).toBe('task');
      expect(testDevlog.id).toBeDefined();

      // Verify we can read it back using the id
      const retrieved = await workspaceManager.getDevlog(testDevlog.id!);
      expect(retrieved).toBeDefined();
      expect(retrieved!.title).toBe('Integration Test Entry');

      // Update the devlog
      const updated = await workspaceManager.updateDevlog(testDevlog.id!, { status: 'done' });
      expect(updated.status).toBe('done');
    } finally {
      await workspaceManager.cleanup();
    }
  });

  it('should handle MCP adapter operations', async () => {
    const adapter = new MCPDevlogAdapter();

    try {
      const result = await adapter.listDevlogs({});
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    } finally {
      await adapter.dispose();
    }
  });

  it('should validate all tools are properly defined', () => {
    expect(allTools).toBeDefined();
    expect(Array.isArray(allTools)).toBe(true);
    expect(allTools.length).toBeGreaterThan(0);

    // Verify each tool has required properties
    allTools.forEach((tool, index) => {
      expect(tool.name, `Tool at index ${index} should have a name`).toBeDefined();
      expect(tool.description, `Tool ${tool.name} should have a description`).toBeDefined();
      expect(tool.inputSchema, `Tool ${tool.name} should have an input schema`).toBeDefined();
      expect(tool.inputSchema.type, `Tool ${tool.name} input schema should have a type`).toBe(
        'object',
      );
    });
  });

  it('should handle workspace operations', async () => {
    const adapter = new MCPDevlogAdapter();

    try {
      // Test getting current workspace ID
      const currentWorkspaceId = adapter.getCurrentWorkspaceId();
      expect(currentWorkspaceId).toBeDefined();
      expect(typeof currentWorkspaceId).toBe('string');

      // Test workspace manager functionality through adapter
      const workspacesList = await adapter.manager.listWorkspaces();
      expect(workspacesList).toBeDefined();
      expect(Array.isArray(workspacesList)).toBe(true);

      // Test setting workspace ID
      const testWorkspaceId = 'test-workspace';
      adapter.setCurrentWorkspaceId(testWorkspaceId);
      expect(adapter.getCurrentWorkspaceId()).toBe(testWorkspaceId);
    } finally {
      await adapter.dispose();
    }
  });

  it('should handle search operations', async () => {
    const adapter = new MCPDevlogAdapter();
    const workspaceManager = new WorkspaceDevlogManager({
      fallbackToEnvConfig: true,
      createWorkspaceConfigIfMissing: true,
    });

    try {
      await workspaceManager.initialize();

      // Create test entries for search
      const testEntry = await workspaceManager.createDevlog({
        title: 'Search Test Entry',
        type: 'task',
        description: 'Test entry for search functionality testing',
        businessContext: 'Search testing context',
        technicalContext: 'Search implementation validation',
      });

      // Test search functionality through adapter
      const searchResult = await adapter.searchDevlogs({ query: 'Search Test' });
      expect(searchResult).toBeDefined();
      expect(searchResult.content).toBeDefined();
    } finally {
      await workspaceManager.cleanup();
      await adapter.dispose();
    }
  });

  it('should run comprehensive integration workflow', async () => {
    // This test runs the full integration workflow similar to the standalone test
    const server = new Server(
      {
        name: 'devlog-mcp-test',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    const adapter = new MCPDevlogAdapter();
    const workspaceManager = new WorkspaceDevlogManager({
      fallbackToEnvConfig: true,
      createWorkspaceConfigIfMissing: true,
    });

    try {
      // Initialize everything
      await workspaceManager.initialize();

      // Test creation and retrieval
      const testDevlog = await workspaceManager.createDevlog({
        title: 'Comprehensive Integration Test',
        type: 'task',
        description: 'Full workflow test',
        businessContext: 'Integration testing',
        technicalContext: 'CI/CD validation',
      });

      expect(testDevlog.id).toBeDefined();

      // Test MCP adapter can list the created devlog
      const adapterResult = await adapter.listDevlogs({});
      expect(adapterResult.content).toBeDefined();

      // Verify server is functional
      expect(server).toBeDefined();
    } finally {
      await workspaceManager.cleanup();
      await adapter.dispose();
    }
  });
});
