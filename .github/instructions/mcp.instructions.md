---
applyTo: 'packages/mcp/src/**/*.ts'
---

# MCP Server Development Guidelines

## � Import System Requirements

### Node.js ESM Compatibility
- **ALWAYS use .js extensions** for all import statements
- **Use relative imports** for internal MCP package modules
- **Use @devlog/* aliases** for core package dependencies
- **Follow strict ESM patterns** for Node.js compatibility

### MCP-Specific Import Patterns
```typescript
// ✅ Correct MCP imports
import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { DevlogManager } from '@devlog/core';

// ✅ Internal MCP imports  
import { MCPAdapter } from './mcp-adapter.js';
import { validateToolInput } from '../utils/validation.js';
import type { ToolDefinition } from '../types/index.js';

// ❌ Avoid: Missing extensions or ambiguous imports
import { MCPAdapter } from './mcp-adapter';      // Missing .js
import { ToolDefinition } from '@/types';        // Ambiguous self-reference
```

## �🔌 MCP Architecture Requirements

### Server Implementation Patterns
- **Use ModelContextProtocol SDK** for all server functionality
- **Implement proper tool definitions** with comprehensive schemas
- **Handle async operations** with proper error boundaries
- **Support graceful shutdown** and resource cleanup

### Tool Registration Patterns
```typescript
// Tool definition template
const toolDefinition: Tool = {
  name: 'mcp_devlog_action_name',
  description: 'Clear, actionable description of what this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param: {
        type: 'string',
        description: 'Clear parameter description',
      },
    },
    required: ['param'],
  },
};
```

### Error Handling Standards
- **Use McpError classes** for MCP-specific errors
- **Provide helpful error messages** for tool failures
- **Log errors with context** before returning to client
- **Handle validation errors** gracefully with clear feedback

## 📡 Tool Development Patterns

### Tool Implementation Structure
```typescript
async function handleToolCall(
  name: string,
  arguments_: any
): Promise<CallToolResult> {
  try {
    // Validate input parameters
    const params = validateToolParams(name, arguments_);
    
    // Execute tool logic
    const result = await executeToolLogic(params);
    
    // Return formatted result
    return {
      content: [
        {
          type: 'text',
          text: formatToolResult(result),
        },
      ],
    };
  } catch (error) {
    // Handle and log errors appropriately
    logger.error(`Tool ${name} failed`, { error, arguments: arguments_ });
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error.message}`
    );
  }
}
```

### Parameter Validation
- **Validate all input parameters** using JSON schema or manual validation
- **Provide clear error messages** for invalid parameters
- **Support optional parameters** with sensible defaults
- **Document parameter requirements** in tool descriptions

### Response Formatting
- **Use consistent response formats** across all tools
- **Provide structured data** when appropriate
- **Include operation metadata** (timestamps, IDs, etc.)
- **Format text responses** for readability

## 🔧 Integration Patterns

### **⚠️ AUTOMATIC MIGRATION DETECTION**
**When editing MCP package files, check if core dependencies changed:**

#### **Cross-Package Change Indicators**
- **Build errors after core updates** → Migration likely needed
- **Type import errors** → Core types may have changed  
- **Method signature mismatches** → Core interfaces updated
- **New core features available** → Integration opportunities

#### **Auto-Check Commands Before MCP Changes**
```bash
# Check if core package changed recently:
git log --oneline packages/core/src/ -10

# Search for your MCP component usage in other packages:
grep -r "MCPAdapterClass" packages/ --include="*.ts"
```

### **Migration Awareness for MCP Package**
⚠️ **When @devlog/core architecture changes:**
1. **Always check MCP adapter** (`mcp-adapter.ts`) for compatibility
2. **Update tool implementations** in `tools/` directory 
3. **Verify manager integration** - ensure using current manager classes
4. **Test cross-package integration** after core updates
5. **Update type imports** and method signatures

### **Common Migration Points:**
- **Manager class changes** → Update adapter initialization and usage
- **Core API changes** → Update tool implementations and error handling
- **Type/interface changes** → Update imports and method signatures
- **Storage provider changes** → Update storage-related tools and validation

### Workspace-Aware Tool Implementation
- **All tools must support workspace context** from WorkspaceDevlogManager
- **Workspace switching** should be handled automatically
- **Tool responses** should indicate which workspace was used
- **Error handling** must account for workspace-related failures

### Tool Implementation with Workspace Support
```typescript
async function handleCreateDevlog(arguments_: any): Promise<CallToolResult> {
  try {
    const params = validateCreateDevlogParams(arguments_);
    
    // ✅ Use workspace-aware manager method
    const entry = await adapter.workspaceManager.createDevlog({
      title: params.title,
      type: params.type,
      description: params.description,
      // ... other fields
    });
    
    return {
      content: [
        {
          type: 'text',
          text: `Created devlog entry: ${entry.id}\nWorkspace: ${entry.workspaceId}\nTitle: ${entry.title}`,
        },
      ],
    };
  } catch (error) {
    // Handle workspace-specific errors
    if (error.message.includes('workspace')) {
      throw new McpError(ErrorCode.InvalidRequest, `Workspace error: ${error.message}`);
    }
    throw error;
  }
}
```

### Core Package Integration
```typescript
export class MCPDevlogAdapter {
  private workspaceManager: WorkspaceDevlogManager;  // Use workspace-aware manager
  private initialized = false;
  
  constructor() {
    // ✅ Use WorkspaceDevlogManager for workspace support
    this.workspaceManager = new WorkspaceDevlogManager({
      defaultWorkspaceId: 'primary',
      autoSwitchWorkspace: true
    });
  }
  
  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.workspaceManager.initialize();
    this.initialized = true;
  }
  
  async dispose(): Promise<void> {
    if (!this.initialized) return;
    await this.workspaceManager.dispose();
    this.initialized = false;
  }
}
```

### Configuration Management
- **Load configuration** from environment variables or config files
- **Validate configuration** at startup
- **Support development/production** configuration variants
- **Document configuration options** clearly

## 🛠️ Tool Categories

### CRUD Operations
- **Naming Convention**: `mcp_devlog_{action}_{resource}`
- **Example**: `mcp_devlog_create_devlog`, `mcp_devlog_update_devlog`
- **Include ID parameters** for operations on existing resources
- **Return full resource data** after modifications

### Query Operations
- **Naming Convention**: `mcp_devlog_list_{resource}`, `mcp_devlog_search_{resource}`
- **Support filtering parameters** for list operations
- **Implement pagination** for large result sets
- **Return metadata** (total count, page info) with results

### Utility Operations
- **Naming Convention**: `mcp_devlog_{action}_{context}`
- **Example**: `mcp_devlog_get_stats`, `mcp_devlog_discover_related`
- **Focus on specific use cases** rather than generic operations
- **Provide helpful context** in responses

## 📊 Response Standards

### Success Responses
```typescript
// For creation operations
{
  content: [
    {
      type: 'text',
      text: `Created devlog entry: ${entry.id}\nTitle: ${entry.title}\nStatus: ${entry.status}`,
    },
  ],
}

// For query operations
{
  content: [
    {
      type: 'text',
      text: JSON.stringify(results, null, 2),
    },
  ],
}
```

### Error Responses
- **Use appropriate McpError codes** (BadRequest, NotFound, InternalError)
- **Include helpful error messages** for debugging
- **Log full error details** server-side
- **Sanitize sensitive information** in error responses

## 🔄 Async Operation Handling

### Long-Running Operations
- **Use background processing** for operations that might take time
- **Provide progress feedback** when possible
- **Support operation cancellation** if applicable
- **Return operation IDs** for tracking

### Resource Management
```typescript
// Proper resource cleanup
process.on('SIGINT', async () => {
  logger.info('Shutting down MCP server...');
  await mcpAdapter.dispose();
  await server.close();
  process.exit(0);
});
```

## 🧪 Testing Requirements

### Integration Testing
- **Test full MCP request/response cycle**
- **Mock external dependencies** appropriately
- **Test error conditions** and edge cases
- **Verify tool schema validation**

### Test Environment Setup
```typescript
describe('MCP Tool Integration', () => {
  let adapter: MCPDevlogAdapter;
  
  beforeEach(async () => {
    adapter = new MCPDevlogAdapter();
    await adapter.initialize();
  });
  
  afterEach(async () => {
    await adapter.dispose();
  });
  
  it('should handle tool calls correctly', async () => {
    const result = await adapter.handleTool('mcp_devlog_list_devlogs', {});
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
  });
});
```

## 📚 Documentation Standards

### Tool Documentation
- **Document each tool** with clear examples
- **Explain parameter requirements** and formats
- **Show expected response formats**
- **Include common error scenarios**

### API Documentation
```typescript
/**
 * Creates a new devlog entry with the provided information.
 * 
 * @param title - The title of the devlog entry
 * @param type - The type of work (feature, bugfix, task, etc.)
 * @param description - Detailed description of the work
 * @returns Promise resolving to the created devlog entry
 * 
 * @example
 * ```typescript
 * const entry = await createDevlog({
 *   title: 'Implement user authentication',
 *   type: 'feature',
 *   description: 'Add JWT-based authentication system'
 * });
 * ```
 */
```

## 🚨 Critical Requirements

### MUST DO
- ✅ Use proper MCP error codes and error handling
- ✅ Validate all tool parameters before execution
- ✅ Implement proper resource cleanup and disposal
- ✅ Follow consistent tool naming conventions
- ✅ Provide comprehensive tool documentation

### MUST NOT DO
- ❌ Expose internal implementation details in tool responses
- ❌ Allow unvalidated parameters to reach core logic
- ❌ Block the event loop with synchronous operations
- ❌ Ignore error conditions or fail silently
- ❌ Create tools without proper input schemas

## 🎯 Quality Standards

### Performance Requirements
- **Tool response time** should be under 1 second for simple operations
- **Memory usage** should remain stable during long-running sessions
- **Connection handling** should be efficient and properly cleaned up
- **Error recovery** should be fast and reliable

### Security Considerations
- **Input validation** for all parameters
- **Error message sanitization** to avoid information leakage
- **Resource access control** based on tool capabilities
- **Audit logging** for important operations

### Reliability Standards
- **Graceful error handling** that doesn't crash the server
- **Resource cleanup** even in error conditions
- **Idempotent operations** where possible
- **Consistent state management** across tool calls
