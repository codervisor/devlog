/**
 * Configuration for MCP server
 * Uses HTTP API client for secure and isolated access to devlog operations
 */

import { logger } from '../server/index.js';

export interface MCPServerConfig {
  /** Default project ID */
  defaultProjectId?: string;
  /** Web API configuration */
  webApi: {
    /** Base URL for the web API server */
    baseUrl: string;
    /** Request timeout in milliseconds */
    timeout?: number;
    /** Number of retry attempts */
    retries?: number;
    /** Auto-discovery of web service */
    autoDiscover?: boolean;
  };
}

/**
 * Load MCP server configuration from environment variables
 */
export function loadMCPConfig(): MCPServerConfig {
  const defaultProjectId = process.env.MCP_DEFAULT_PROJECT || 'default';
  const baseUrl = process.env.MCP_WEB_API_URL || 'http://localhost:3200';
  const timeout = process.env.MCP_WEB_API_TIMEOUT
    ? parseInt(process.env.MCP_WEB_API_TIMEOUT, 10)
    : 30000;
  const retries = process.env.MCP_WEB_API_RETRIES
    ? parseInt(process.env.MCP_WEB_API_RETRIES, 10)
    : 3;
  const autoDiscover = process.env.MCP_WEB_API_AUTO_DISCOVER !== 'false'; // Default to true

  return {
    defaultProjectId,
    webApi: {
      baseUrl,
      timeout,
      retries,
      autoDiscover,
    },
  };
}

/**
 * Validate MCP configuration
 */
export function validateMCPConfig(config: MCPServerConfig): void {
  if (!config.webApi?.baseUrl) {
    throw new Error('Web API base URL is required');
  }

  try {
    new URL(config.webApi.baseUrl);
  } catch {
    throw new Error(`Invalid web API base URL: ${config.webApi.baseUrl}`);
  }

  if (config.webApi?.timeout && config.webApi.timeout < 1000) {
    throw new Error('Web API timeout must be at least 1000ms');
  }

  if (config.webApi?.retries && (config.webApi.retries < 0 || config.webApi.retries > 10)) {
    throw new Error('Web API retries must be between 0 and 10');
  }
}

/**
 * Print configuration summary for debugging
 */
export function printConfigSummary(config: MCPServerConfig): void {
  logger.info('\n=== MCP Server Configuration ===');
  logger.info(`Default Project: ${config.defaultProjectId}`);
  logger.info(`Web API URL: ${config.webApi.baseUrl}`);
  logger.info(`Timeout: ${config.webApi.timeout}ms`);
  logger.info(`Retries: ${config.webApi.retries}`);
  logger.info(`Auto-discover: ${config.webApi.autoDiscover}`);
  logger.info('================================\n');
}
