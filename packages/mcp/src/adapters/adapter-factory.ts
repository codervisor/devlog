/**
 * Factory for creating MCP adapters
 * Uses HTTP API client for secure and isolated access to devlog operations
 */

import { MCPApiAdapter, type MCPApiAdapterConfig } from './mcp-api-adapter.js';
import {
  loadMCPConfig,
  validateMCPConfig,
  printConfigSummary,
  type MCPServerConfig,
} from '../config/mcp-config.js';

export type MCPAdapter = MCPApiAdapter;

/**
 * Create an MCP adapter using HTTP API client
 */
export async function createMCPAdapter(config?: MCPServerConfig): Promise<MCPAdapter> {
  // Load configuration if not provided
  const mcpConfig = config || loadMCPConfig();

  // Validate configuration
  validateMCPConfig(mcpConfig);

  // Print configuration summary for debugging
  printConfigSummary(mcpConfig);

  // Create API-based adapter
  const apiConfig: MCPApiAdapterConfig = {
    apiClient: {
      baseUrl: mcpConfig.webApi.baseUrl,
      timeout: mcpConfig.webApi.timeout,
      retries: mcpConfig.webApi.retries,
    },
    defaultProjectId: mcpConfig.defaultProjectId ? Number(mcpConfig.defaultProjectId) : undefined,
    autoDiscoverWebService: mcpConfig.webApi.autoDiscover,
  };

  const adapter = new MCPApiAdapter(apiConfig);
  console.log('Created MCP API Adapter (HTTP client mode)');

  // Initialize the adapter
  await adapter.initialize();

  return adapter;
}

/**
 * Check if web API is available for API mode
 */
export async function checkWebApiAvailability(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/projects`, {
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

  // If auto-discovery is enabled, try to find web API
  if (config.webApi.autoDiscover) {
    const discoveredUrl = await discoverWebApiUrl();

    if (discoveredUrl) {
      // Update config with discovered URL
      config.webApi.baseUrl = discoveredUrl;
      console.log(`Using discovered web API URL: ${discoveredUrl}`);
    } else {
      console.warn('Could not discover web API, using configured URL:', config.webApi.baseUrl);
    }
  }

  return createMCPAdapter(config);
}

/**
 * Type guard for API adapter (always true now)
 */
export function isApiAdapter(adapter: MCPAdapter): adapter is MCPApiAdapter {
  return adapter instanceof MCPApiAdapter;
}
