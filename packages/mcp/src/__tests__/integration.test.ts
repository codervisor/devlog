import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MCPDevlogAdapter } from '../mcp-adapter.js';
import { DevlogManager } from '@devlog/core';
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
      private: true
    };
    await fs.writeFile(
      path.join(testWorkspace, 'package.json'), 
      JSON.stringify(packageJson, null, 2)
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

  it('should initialize DevlogManager successfully', async () => {
    const devlogManager = new DevlogManager();
    await devlogManager.initialize();
    expect(devlogManager).toBeDefined();
    
    // Test basic functionality
    const result = await devlogManager.listDevlogs({});
    expect(result).toBeDefined();
    expect(result.items).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
    
    // Clean up
    await devlogManager.dispose();
  });

  it('should perform basic CRUD operations', async () => {
    const devlogManager = new DevlogManager();
    await devlogManager.initialize();
    
    try {
      // Create a test devlog
      const testDevlog = await devlogManager.createDevlog({
        title: 'Integration Test Entry',
        type: 'task',
        description: 'Test entry created during integration testing',
        businessContext: 'Testing MCP server functionality',
        technicalContext: 'CI/CD pipeline validation'
      });
      
      expect(testDevlog).toBeDefined();
      expect(testDevlog.title).toBe('Integration Test Entry');
      expect(testDevlog.type).toBe('task');
      expect(testDevlog.id).toBeDefined();
      
      // Verify we can read it back using the id
      const retrieved = await devlogManager.getDevlog(testDevlog.id!);
      expect(retrieved).toBeDefined();
      expect(retrieved!.title).toBe('Integration Test Entry');
      
      // Update the devlog
      const updated = await devlogManager.updateDevlog({ id: testDevlog.id!, status: 'done' });
      expect(updated.status).toBe('done');
      
    } finally {
      await devlogManager.dispose();
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
    const devlogManager = new DevlogManager();
    
    try {
      // Initialize everything
      await devlogManager.initialize();
      
      // Test creation and retrieval
      const testDevlog = await devlogManager.createDevlog({
        title: 'Comprehensive Integration Test',
        type: 'task',
        description: 'Full workflow test',
        businessContext: 'Integration testing',
        technicalContext: 'CI/CD validation'
      });
      
      expect(testDevlog.id).toBeDefined();
      
      // Test MCP adapter can list the created devlog
      const adapterResult = await adapter.listDevlogs({});
      expect(adapterResult.content).toBeDefined();
      
      // Verify server is functional
      expect(server).toBeDefined();
      
    } finally {
      await devlogManager.dispose();
      await adapter.dispose();
    }
  });
});
