/**
 * Configuration manager for determining the best storage strategy
 */

// Load environment variables from .env file if available
import * as fs from 'fs/promises';
import * as path from 'path';
import type { DevlogConfig, StorageConfig } from './types/index.js';
import { getWorkspaceRoot } from './utils/storage.js';

export class ConfigurationManager {
  private workspaceRoot: string | null = null;
  private configPath: string | null = null;
  private currentWorkspace: string | null = null;

  constructor(workspace?: string) {
    this.currentWorkspace = workspace || null;
  }

  async initialize(): Promise<void> {
    this.workspaceRoot = getWorkspaceRoot();
    this.configPath = path.resolve(this.workspaceRoot, 'devlog.config.json');
  }

  /**
   * Load configuration from file or environment
   */
  async loadConfig(): Promise<DevlogConfig> {
    await this.ensureInitialized();
    // Try to load from config file first
    let configData;
    try {
      configData = await fs.readFile(this.configPath!, 'utf-8');
    } catch (error: any) {
      console.warn('Failed to load configuration from file:', error.message);
      // Config file doesn't exist, create default configuration
      return this.createDefaultConfig();
    }
    try {
      const expandedConfigData = this.expandEnvironmentVariables(configData);
      return JSON.parse(expandedConfigData) as DevlogConfig;
    } catch (error: any) {
      console.error('Failed to parse configuration:', error.message);
      throw new Error(`Invalid configuration format: ${error.message}`);
    }
  }

  /**
   * Save configuration to file
   */
  async saveConfig(config: DevlogConfig): Promise<void> {
    await this.ensureInitialized();
    const configData = JSON.stringify(config, null, 2);
    await fs.writeFile(this.configPath!, configData);
  }

  /**
   * Detect the best storage configuration automatically
   */
  getDefaultStorageConfig(): StorageConfig {
    return {
      type: 'json',
      json: {
        directory: '.devlog',
        filePattern: `{id:auto}-{slug}.json`,
        minPadding: 3,
        global: true,
      },
    };
  }

  private async createDefaultConfig(): Promise<DevlogConfig> {
    const storage = this.getDefaultStorageConfig();
    // const integrations = await this.detectEnterpriseIntegrations();
    // const syncStrategy = await this.detectSyncStrategy(integrations);

    return {
      storage,
      // integrations,
      // syncStrategy,
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.workspaceRoot || !this.configPath) {
      await this.initialize();
    }
  }

  /**
   * Expand environment variables in configuration string
   * Supports ${VAR_NAME} and $VAR_NAME syntax
   */
  private expandEnvironmentVariables(configData: string): string {
    // Replace ${VAR_NAME} syntax
    let expanded = configData.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const value = process.env[varName];
      if (value === undefined) {
        throw new Error(`Environment variable ${varName} is not defined`);
      }
      return value;
    });

    // Replace $VAR_NAME syntax (word boundaries)
    expanded = expanded.replace(/\$([A-Z_][A-Z0-9_]*)/g, (match, varName) => {
      const value = process.env[varName];
      if (value === undefined) {
        throw new Error(`Environment variable ${varName} is not defined`);
      }
      return value;
    });

    return expanded;
  }
}
