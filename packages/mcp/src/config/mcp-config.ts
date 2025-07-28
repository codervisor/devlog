/**
 * Configuration for MCP server architecture mode
 * Determines whether to use direct core access or HTTP API client
 */

export interface MCPServerConfig {
  /** Architecture mode: 'direct' uses core directly, 'api' uses HTTP client */
  mode: 'direct' | 'api';
  /** Default workspace ID */
  defaultProjectId?: string;
  /** Web API configuration (required for 'api' mode) */
  webApi?: {
    /** Base URL for the web API server */
    baseUrl: string;
    /** Request timeout in milliseconds */
    timeout?: number;
    /** Number of retry attempts */
    retries?: number;
    /** Auto-discovery of web service */
    autoDiscover?: boolean;
  };
  /** Direct core configuration (for 'direct' mode) */
  direct?: {
    /** Workspace configuration path */
    workspaceConfigPath?: string;
    /** Create workspace config if missing */
    createWorkspaceConfigIfMissing?: boolean;
    /** Fallback to environment config */
    fallbackToEnvConfig?: boolean;
  };
}

/**
 * Load MCP server configuration from environment variables
 */
export function loadMCPConfig(): MCPServerConfig {
  const mode = (process.env.MCP_MODE || 'direct') as 'direct' | 'api';
  const defaultProjectId = process.env.MCP_DEFAULT_PROJECT || 'default';

  const config: MCPServerConfig = {
    mode,
    defaultProjectId,
  };

  if (mode === 'api') {
    const baseUrl = process.env.MCP_WEB_API_URL || 'http://localhost:3200';
    const timeout = process.env.MCP_WEB_API_TIMEOUT
      ? parseInt(process.env.MCP_WEB_API_TIMEOUT, 10)
      : 30000;
    const retries = process.env.MCP_WEB_API_RETRIES
      ? parseInt(process.env.MCP_WEB_API_RETRIES, 10)
      : 3;
    const autoDiscover = process.env.MCP_WEB_API_AUTO_DISCOVER === 'true';

    config.webApi = {
      baseUrl,
      timeout,
      retries,
      autoDiscover,
    };
  } else {
    // Direct mode configuration
    config.direct = {
      workspaceConfigPath: process.env.MCP_WORKSPACE_CONFIG_PATH,
      createWorkspaceConfigIfMissing: process.env.MCP_CREATE_WORKSPACE_CONFIG !== 'false',
      fallbackToEnvConfig: process.env.MCP_FALLBACK_TO_ENV_CONFIG !== 'false',
    };
  }

  return config;
}

/**
 * Validate MCP configuration
 */
export function validateMCPConfig(config: MCPServerConfig): void {
  if (config.mode === 'api') {
    if (!config.webApi?.baseUrl) {
      throw new Error('Web API base URL is required for API mode');
    }

    try {
      new URL(config.webApi.baseUrl);
    } catch {
      throw new Error(`Invalid web API base URL: ${config.webApi.baseUrl}`);
    }
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
  console.log('\n=== MCP Server Configuration ===');
  console.log(`Mode: ${config.mode}`);
  console.log(`Default Project: ${config.defaultProjectId}`);

  if (config.mode === 'api' && config.webApi) {
    console.log(`Web API URL: ${config.webApi.baseUrl}`);
    console.log(`Timeout: ${config.webApi.timeout}ms`);
    console.log(`Retries: ${config.webApi.retries}`);
    console.log(`Auto-discover: ${config.webApi.autoDiscover}`);
  } else if (config.mode === 'direct' && config.direct) {
    console.log(`Workspace Config: ${config.direct.workspaceConfigPath || 'default'}`);
    console.log(`Create Config: ${config.direct.createWorkspaceConfigIfMissing}`);
    console.log(`Fallback to Env: ${config.direct.fallbackToEnvConfig}`);
  }
  console.log('================================\n');
}
