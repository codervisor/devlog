/**
 * Configuration manager for determining the best storage strategy
 * Now uses environment variables instead of devlog.config.json
 */

import type { DevlogConfig, StorageConfig } from './types/index.js';
import { getWorkspaceRoot } from './utils/storage.js';

export class ConfigurationManager {
  private workspaceRoot: string | null = null;
  private currentWorkspace: string | null = null;

  constructor(workspace?: string) {
    this.currentWorkspace = workspace || null;
  }

  async initialize(): Promise<void> {
    this.workspaceRoot = getWorkspaceRoot();
  }

  /**
   * Load configuration from environment variables
   */
  async loadConfig(): Promise<DevlogConfig> {
    await this.ensureInitialized();
    
    return this.createConfigFromEnvironment();
  }

  /**
   * Save configuration to environment (deprecated - configs should be managed via .env files)
   */
  async saveConfig(config: DevlogConfig): Promise<void> {
    console.warn('saveConfig is deprecated. Please use .env files for configuration management.');
    throw new Error('Configuration saving is deprecated. Use .env files instead.');
  }

  /**
   * Detect the best storage configuration automatically
   */
  getDefaultStorageConfig(): StorageConfig {
    // Auto-detect from environment variables
    const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    const mysqlUrl = process.env.MYSQL_URL;
    const sqliteUrl = process.env.SQLITE_URL;
    
    // Check for PostgreSQL
    if (postgresUrl) {
      console.log('🐘 Auto-detected PostgreSQL from environment variables');
      return {
        type: 'postgres',
        connectionString: postgresUrl,
        options: {
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
          connectionTimeoutMillis: 15000,
          idleTimeoutMillis: 30000,
          max: 20,
        },
      };
    }
    
    // Check for MySQL
    if (mysqlUrl) {
      console.log('🐬 Auto-detected MySQL from environment variables');
      return {
        type: 'mysql',
        connectionString: mysqlUrl,
        options: {
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
          connectionTimeout: 15000,
          acquireTimeout: 30000,
          connectionLimit: 20,
        },
      };
    }
    
    // Check for SQLite
    if (sqliteUrl) {
      console.log('🗃️ Auto-detected SQLite from environment variables');
      return {
        type: 'sqlite',
        connectionString: sqliteUrl,
        options: {
          enableWAL: true,
          timeout: 5000,
        },
      };
    }
    
    // Check for GitHub storage configuration
    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER;
    const githubRepo = process.env.GITHUB_REPO;
    
    if (githubToken && githubOwner && githubRepo) {
      console.log('🐙 Auto-detected GitHub storage from environment variables');
      return {
        type: 'github',
        github: {
          owner: githubOwner,
          repo: githubRepo,
          token: githubToken,
          branch: process.env.GITHUB_BRANCH || 'main',
          labelsPrefix: process.env.GITHUB_LABELS_PREFIX || 'devlog',
          apiUrl: process.env.GITHUB_API_URL, // For GitHub Enterprise
          mapping: {
            useNativeType: this.parseBoolean(process.env.GITHUB_USE_NATIVE_TYPE, true),
            useNativeLabels: this.parseBoolean(process.env.GITHUB_USE_NATIVE_LABELS, true),
            useStateReason: this.parseBoolean(process.env.GITHUB_USE_STATE_REASON, true),
            projectId: process.env.GITHUB_PROJECT_ID ? parseInt(process.env.GITHUB_PROJECT_ID, 10) : undefined,
          },
          rateLimit: {
            requestsPerHour: process.env.GITHUB_RATE_LIMIT_PER_HOUR ? parseInt(process.env.GITHUB_RATE_LIMIT_PER_HOUR, 10) : 4000,
            retryDelay: process.env.GITHUB_RETRY_DELAY ? parseInt(process.env.GITHUB_RETRY_DELAY, 10) : 1000,
            maxRetries: process.env.GITHUB_MAX_RETRIES ? parseInt(process.env.GITHUB_MAX_RETRIES, 10) : 3,
          },
          cache: {
            enabled: this.parseBoolean(process.env.GITHUB_CACHE_ENABLED, true),
            ttl: process.env.GITHUB_CACHE_TTL ? parseInt(process.env.GITHUB_CACHE_TTL, 10) : 300000,
          },
        },
      };
    }
    
    // Default fallback to JSON with environment variable customization
    console.log('📄 Using JSON storage (no database URL detected)');
    return {
      type: 'json',
      json: {
        directory: process.env.DEVLOG_JSON_DIRECTORY || '.devlog',
        filePattern: process.env.DEVLOG_JSON_FILE_PATTERN || '{id:auto}-{slug}.json',
        minPadding: process.env.DEVLOG_JSON_MIN_PADDING ? parseInt(process.env.DEVLOG_JSON_MIN_PADDING, 10) : 3,
        global: this.parseBoolean(process.env.DEVLOG_JSON_GLOBAL, true),
      },
    };
  }

  private async createConfigFromEnvironment(): Promise<DevlogConfig> {
    const storage = this.getDefaultStorageConfig();

    return {
      storage,
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.workspaceRoot) {
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

  /**
   * Parse a boolean value from environment variable
   */
  private parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) {
      return defaultValue;
    }
    return value.toLowerCase() === 'true' || value === '1';
  }
}
