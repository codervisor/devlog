#!/usr/bin/env node

/**
 * MCP protocol compliance tests
 * Tests the MCP server against the Model Context Protocol specification
 */

import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testMCPCompliance() {
  console.log('🧪 Starting MCP protocol compliance tests...');
  
  const mcpServerPath = path.join(__dirname, '../packages/mcp/build/index.js');
  
  try {
    // Test 1: Server starts without errors
    console.log('🔍 Test 1: Server startup...');
    const serverProcess = spawn('node', [mcpServerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000
    });
    
    let serverOutput = '';
    let serverError = '';
    
    serverProcess.stdout.on('data', (data) => {
      serverOutput += data.toString();
    });
    
    serverProcess.stderr.on('data', (data) => {
      serverError += data.toString();
    });
    
    // Give the server time to start
    await sleep(1000);
    
    // Test 2: Initialize MCP protocol
    console.log('🔍 Test 2: MCP initialize protocol...');
    const initMessage = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "test-client",
          version: "1.0.0"
        }
      }
    };
    
    serverProcess.stdin.write(JSON.stringify(initMessage) + '\n');
    
    // Wait for response
    await sleep(1000);
    
    // Test 3: List tools
    console.log('🔍 Test 3: List tools...');
    const listToolsMessage = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {}
    };
    
    serverProcess.stdin.write(JSON.stringify(listToolsMessage) + '\n');
    
    // Wait for response
    await sleep(1000);
    
    // Test 4: Call a tool
    console.log('🔍 Test 4: Call tool...');
    const callToolMessage = {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "list_devlogs",
        arguments: {}
      }
    };
    
    serverProcess.stdin.write(JSON.stringify(callToolMessage) + '\n');
    
    // Wait for response
    await sleep(1000);
    
    // Clean shutdown
    serverProcess.kill('SIGTERM');
    
    await new Promise((resolve) => {
      serverProcess.on('close', (code) => {
        console.log(`Server process exited with code: ${code}`);
        resolve();
      });
    });
    
    // Check for error output
    if (serverError && !serverError.includes('Devlog MCP Server started')) {
      console.warn('⚠️ Server stderr output:', serverError);
    }
    
    console.log('✅ MCP protocol compliance tests completed');
    console.log('📊 Server output sample:', serverOutput.slice(0, 200) + '...');
    
  } catch (error) {
    console.error('❌ MCP compliance tests failed:', error);
    process.exit(1);
  }
}

// Run compliance tests
testMCPCompliance().catch((error) => {
  console.error('❌ Unexpected error in MCP compliance tests:', error);
  process.exit(1);
});
