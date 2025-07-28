/**
 * Centralized Application Configuration Manager
 *
 * Manages the single, centralized storage configuration for the entire application.
 * Replaces the per-workspace storage configuration with a unified approach.
 */

import { homedir } from 'os';
import { join } from 'path';
import type { StorageConfig, StorageType } from '../../types/storage.js';
import type { AppStorageConfig } from '../../types/project.js';

export interface AppConfigManagerOptions {
  /** Path to the application configuration file */
  configPath?: string;

  /** Whether to create config file if it doesn't exist */
  createIfMissing?: boolean;

  /** Override storage type for testing/development */
  storageTypeOverride?: StorageType;
}

/**
 * Centralized application configuration manager
 */
export class AppConfigManager {
  private config: AppStorageConfig | null = null;
  private readonly configPath: string;

  constructor(private options: AppConfigManagerOptions = {}) {
    this.configPath = options.configPath || join(homedir(), '.devlog', 'app-config.json');
  }

  /**
   * Get the centralized storage configuration
   */
  async getStorageConfig(): Promise<StorageConfig> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config!.storage;
  }

  /**
   * Update the storage configuration
   */
  async updateStorageConfig(storage: StorageConfig): Promise<void> {
    if (!this.config) {
      await this.loadConfig();
    }
    this.config!.storage = storage;
    await this.saveConfig();
  }

  /**
   * Get the complete application configuration
   */
  async getAppConfig(): Promise<AppStorageConfig> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config!;
  }

  /**
   * Determine storage configuration based on environment
   */
  private determineStorageConfig(): StorageConfig {
    // Use override if provided (for testing)
    if (this.options.storageTypeOverride) {
      return this.createStorageConfigForType(this.options.storageTypeOverride);
    }

    // Check explicit storage type configuration first (highest priority)
    const explicitStorageType = process.env.DEVLOG_STORAGE_TYPE?.toLowerCase() as StorageType;
    if (
      explicitStorageType &&
      ['json', 'sqlite', 'mysql', 'postgres', 'github'].includes(explicitStorageType)
    ) {
      return this.createStorageConfigForType(explicitStorageType);
    }

    // Auto-detection logic based on available environment variables
    const hasPostgresUrl = !!process.env.POSTGRES_URL;
    const hasMysqlUrl = !!process.env.MYSQL_URL;
    const isVercel = !!process.env.VERCEL;
    const isProduction = process.env.NODE_ENV === 'production';

    // Prefer database storage in cloud environments
    if (hasPostgresUrl) {
      return this.createStorageConfigForType('postgres');
    }
    if (hasMysqlUrl) {
      return this.createStorageConfigForType('mysql');
    }
    if (isVercel || isProduction) {
      // Default to SQLite for production environments without explicit DB config
      return this.createStorageConfigForType('sqlite');
    }

    // Default to JSON for development
    return this.createStorageConfigForType('json');
  }

  /**
   * Create storage configuration for a specific type
   */
  private createStorageConfigForType(storageType: StorageType): StorageConfig {
    switch (storageType) {
      case 'postgres':
        return {
          type: 'postgres',
          connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
          options: {
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
          },
        };

      case 'mysql':
        return {
          type: 'mysql',
          connectionString: process.env.MYSQL_URL || process.env.DATABASE_URL,
        };

      case 'sqlite':
        return {
          type: 'sqlite',
          connectionString: process.env.SQLITE_PATH || join(homedir(), '.devlog', 'devlog.db'),
        };

      case 'github':
        return {
          type: 'github',
          github: {
            owner: process.env.GITHUB_OWNER || '',
            repo: process.env.GITHUB_REPO || '',
            token: process.env.GITHUB_TOKEN || '',
            apiUrl: process.env.GITHUB_API_URL,
            branch: process.env.GITHUB_BRANCH || 'main',
          },
        };

      case 'json':
      default:
        return {
          type: 'json',
          json: {
            directory: '.devlog',
            global: false,
            filePattern: '{id:03d}-{slug}.json',
          },
        };
    }
  }

  /**
   * Load configuration from file or create default
   */
  private async loadConfig(): Promise<void> {
    try {
      const { promises: fs } = await import('fs');
      const content = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(content);
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code === 'ENOENT' &&
        this.options.createIfMissing !== false
      ) {
        await this.createDefaultConfig();
      } else {
        throw new Error(`Failed to load application configuration: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Create default configuration
   */
  private async createDefaultConfig(): Promise<void> {
    this.config = {
      storage: this.determineStorageConfig(),
      cache: {
        enabled: process.env.NODE_ENV === 'production',
        type: 'memory',
        ttl: 300000, // 5 minutes
      },
    };
    await this.saveConfig();
  }

  /**
   * Save configuration to file
   */
  private async saveConfig(): Promise<void> {
    const { promises: fs } = await import('fs');
    const { dirname } = await import('path');

    // Ensure directory exists
    await fs.mkdir(dirname(this.configPath), { recursive: true });

    // Save with pretty formatting
    const content = JSON.stringify(this.config, null, 2);
    await fs.writeFile(this.configPath, content, 'utf-8');
  }
}
