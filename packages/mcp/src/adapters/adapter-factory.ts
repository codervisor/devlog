/**
 * Factory for creating MCP adapters based on configuration
 * Supports both direct core access and HTTP API client modes
 */

import { MCPDevlogAdapter } from './mcp-adapter.js';
import { MCPApiAdapter, type MCPApiAdapterConfig } from './mcp-api-adapter.js';
import {
  loadMCPConfig,
  validateMCPConfig,
  printConfigSummary,
  type MCPServerConfig,
} from '../config/mcp-config.js';

export type MCPAdapter = MCPDevlogAdapter | MCPApiAdapter;

/**
 * Create an MCP adapter based on configuration
 */
export async function createMCPAdapter(config?: MCPServerConfig): Promise<MCPAdapter> {
  // Load configuration if not provided
  const mcpConfig = config || loadMCPConfig();

  // Validate configuration
  validateMCPConfig(mcpConfig);

  // Print configuration summary for debugging
  printConfigSummary(mcpConfig);

  let adapter: MCPAdapter;

  if (mcpConfig.mode === 'api') {
    // Create API-based adapter
    if (!mcpConfig.webApi) {
      throw new Error('Web API configuration is required for API mode');
    }

    const apiConfig: MCPApiAdapterConfig = {
      apiClient: {
        baseUrl: mcpConfig.webApi.baseUrl,
        timeout: mcpConfig.webApi.timeout,
        retries: mcpConfig.webApi.retries,
      },
      defaultWorkspaceId: mcpConfig.defaultWorkspaceId,
      autoDiscoverWebService: mcpConfig.webApi.autoDiscover,
    };

    adapter = new MCPApiAdapter(apiConfig);
    console.log('Created MCP API Adapter (HTTP client mode)');
  } else {
    // Create direct core access adapter (existing implementation)
    const directConfig = mcpConfig.direct || {};

    adapter = new MCPDevlogAdapter(mcpConfig.defaultWorkspaceId);
    console.log('Created MCP Direct Adapter (core access mode)');
  }

  // Initialize the adapter
  await adapter.initialize();

  return adapter;
}

/**
 * Check if web API is available for API mode
 */
export async function checkWebApiAvailability(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/workspaces`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Auto-discover web API URL (for development)
 */
export async function discoverWebApiUrl(): Promise<string | null> {
  const candidates = [
    'http://localhost:3200',
    'http://localhost:3000',
    'http://127.0.0.1:3200',
    'http://127.0.0.1:3000',
  ];

  for (const url of candidates) {
    console.log(`Checking web API at ${url}...`);
    if (await checkWebApiAvailability(url)) {
      console.log(`Found web API at ${url}`);
      return url;
    }
  }

  return null;
}

/**
 * Create MCP adapter with automatic web API discovery
 */
export async function createMCPAdapterWithDiscovery(): Promise<MCPAdapter> {
  const config = loadMCPConfig();

  // If in API mode and auto-discovery is enabled, try to find web API
  if (config.mode === 'api' && config.webApi?.autoDiscover) {
    const discoveredUrl = await discoverWebApiUrl();

    if (discoveredUrl) {
      // Update config with discovered URL
      config.webApi.baseUrl = discoveredUrl;
      console.log(`Using discovered web API URL: ${discoveredUrl}`);
    } else {
      console.warn('Could not discover web API, falling back to direct mode');
      config.mode = 'direct';
    }
  }

  return createMCPAdapter(config);
}

/**
 * Get adapter interface type for tools
 */
export function getAdapterInterface(adapter: MCPAdapter): 'direct' | 'api' {
  return adapter instanceof MCPApiAdapter ? 'api' : 'direct';
}

/**
 * Type guard for direct adapter
 */
export function isDirectAdapter(adapter: MCPAdapter): adapter is MCPDevlogAdapter {
  return adapter instanceof MCPDevlogAdapter;
}

/**
 * Type guard for API adapter
 */
export function isApiAdapter(adapter: MCPAdapter): adapter is MCPApiAdapter {
  return adapter instanceof MCPApiAdapter;
}
