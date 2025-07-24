/**
 * Adapter exports for MCP package
 */

export { MCPDevlogAdapter } from './mcp-adapter.js';
export { MCPApiAdapter } from './mcp-api-adapter.js';
export {
  createMCPAdapter,
  createMCPAdapterWithDiscovery,
  checkWebApiAvailability,
  discoverWebApiUrl,
  getAdapterInterface,
  isDirectAdapter,
  isApiAdapter,
  type MCPAdapter,
} from './adapter-factory.js';
