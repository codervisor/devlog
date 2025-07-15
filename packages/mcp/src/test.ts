#!/usr/bin/env node

/**
 * Integration test script for MCP server
 * This file will be compiled to build/test.js and used in CI
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { MCPDevlogAdapter } from './mcp-adapter.js';
import { DevlogManager } from '@devlog/core';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

async function runIntegrationTests(): Promise<void> {
  console.log('🚀 Starting MCP server integration tests...');
  
  try {
    // Create a temporary workspace for testing
    const testWorkspace = path.join(os.tmpdir(), 'mcp-test-workspace');
    await fs.mkdir(testWorkspace, { recursive: true });
    
    console.log(`📁 Created test workspace: ${testWorkspace}`);
    
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
    
    // Test 1: Server creation
    console.log('🧪 Test 1: Server creation...');
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
    if (!server) {
      throw new Error('Failed to create MCP server');
    }
    console.log('✅ Server created successfully');
    
    // Test 2: MCPDevlogAdapter initialization
    console.log('🧪 Test 2: MCPDevlogAdapter initialization...');
    const adapter = new MCPDevlogAdapter();
    if (!adapter) {
      throw new Error('Failed to create MCPDevlogAdapter');
    }
    console.log('✅ MCPDevlogAdapter initialized successfully');
    
    // Test 3: DevlogManager initialization
    console.log('🧪 Test 3: DevlogManager initialization...');
    const devlogManager = new DevlogManager();
    await devlogManager.initialize();
    if (!devlogManager) {
      throw new Error('Failed to create DevlogManager');
    }
    console.log('✅ DevlogManager initialized successfully');
    
    // Test 4: Database initialization
    console.log('🧪 Test 4: Database initialization...');
    try {
      const devlogs = await devlogManager.listDevlogs({});
      console.log(`✅ Database initialized successfully, found ${devlogs.length} devlogs`);
    } catch (error) {
      throw new Error(`Database initialization failed: ${error}`);
    }
    
    // Test 5: Basic CRUD operations
    console.log('🧪 Test 5: Basic CRUD operations...');
    try {
      const testDevlog = await devlogManager.createDevlog({
        title: 'Integration Test Entry',
        type: 'task',
        description: 'Test entry created during integration testing',
        businessContext: 'Testing MCP server functionality',
        technicalContext: 'CI/CD pipeline validation'
      });
      
      console.log(`✅ Created test devlog with key: ${testDevlog.key} and id: ${testDevlog.id}`);
      
      // Verify we can read it back using the id
      if (!testDevlog.id) {
        throw new Error('Created devlog missing id');
      }
      
      const retrieved = await devlogManager.getDevlog(testDevlog.id);
      if (!retrieved || retrieved.title !== 'Integration Test Entry') {
        throw new Error('Failed to retrieve created devlog');
      }
      console.log('✅ Successfully retrieved created devlog');
      
      // Clean up test data
      await devlogManager.updateDevlog({ id: testDevlog.id, status: 'done' });
      console.log('✅ Successfully updated devlog status');
      
    } catch (error) {
      throw new Error(`CRUD operations failed: ${error}`);
    }
    
    // Test 6: MCP adapter operations
    console.log('🧪 Test 6: MCP adapter operations...');
    try {
      const result = await adapter.listDevlogs({});
      if (!result.content || !Array.isArray(result.content) || result.content.length === 0) {
        throw new Error('Adapter listDevlogs returned unexpected format');
      }
      console.log('✅ MCP adapter operations verified');
    } catch (error) {
      throw new Error(`MCP adapter operations failed: ${error}`);
    }
    
    // Test 7: Server instantiation verification
    console.log('🧪 Test 7: Server instantiation verification...');
    if (!server) {
      throw new Error('Server instance is invalid');
    }
    console.log('✅ Server instantiation verified');
    
    // Cleanup
    await devlogManager.dispose();
    await adapter.dispose();
    await fs.rm(testWorkspace, { recursive: true, force: true });
    console.log('🧹 Cleaned up test workspace');
    
    console.log('🎉 All integration tests passed!');
    
  } catch (error) {
    console.error('❌ Integration tests failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationTests().catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

export { runIntegrationTests };
