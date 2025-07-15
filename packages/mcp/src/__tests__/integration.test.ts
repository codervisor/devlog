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

  beforeAll(async () => {
    originalCwd = process.cwd();
    testWorkspace = path.join(os.tmpdir(), 'mcp-integration-test-workspace');
    
    // Ensure test workspace exists
    await fs.mkdir(testWorkspace, { recursive: true });
    
    // Create a minimal devlog config for testing
    const testConfig = {
      storage: {
        type: 'json',
        json: {
          directory: '.devlog',
          global: false
        }
      }
    };
    await fs.writeFile(
      path.join(testWorkspace, 'devlog.config.json'), 
      JSON.stringify(testConfig, null, 2)
    );
    
    // Set up environment for testing
    process.chdir(testWorkspace);
  });

  afterAll(async () => {
    // Restore original working directory
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
    const devlogs = await devlogManager.listDevlogs({});
    expect(Array.isArray(devlogs)).toBe(true);
    
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
