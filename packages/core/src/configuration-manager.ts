/**
 * Configuration manager for determining the best storage strategy
 * Now uses environment variables instead of devlog.config.json
 */

// Load environment variables from root .env file
import { loadRootEnv } from './utils/env-loader.js';

import type {
  DevlogConfig,
  StorageConfig,
  StorageType,
  PostgreSQLStorageOptions,
  MySQLStorageOptions,
  SQLiteStorageOptions,
  JsonStorageOptions,
} from './types/index.js';
import { getWorkspaceRoot } from './utils/storage.js';

export class ConfigurationManager {
  private workspaceRoot: string | null = null;

  async initialize(): Promise<void> {
    // Load environment variables from root directory
    loadRootEnv();
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
   * Get storage configuration with JSON as default
   */
  getDefaultStorageConfig(): StorageConfig {
    // Check for explicit storage type specification
    const explicitStorageType = process.env.DEVLOG_STORAGE_TYPE?.toLowerCase() as StorageType;

    if (explicitStorageType) {
      console.log(`🎯 Using explicitly configured storage type: ${explicitStorageType}`);
      return this.createStorageConfigForType(explicitStorageType);
    }

    // Default to JSON storage (no auto-detection)
    console.log(
      '📄 Using default JSON storage (set DEVLOG_STORAGE_TYPE to use other storage types)',
    );
    return this.createJsonConfig();
  }

  /**
   * Create storage configuration for a specific type
   */
  private createStorageConfigForType(storageType: StorageType): StorageConfig {
    switch (storageType) {
      case 'postgres':
        return this.createPostgreSQLConfig();
      case 'mysql':
        return this.createMySQLConfig();
      case 'sqlite':
        return this.createSQLiteConfig();
      case 'github':
        return this.createGitHubConfig();
      case 'json':
        return this.createJsonConfig();
      default:
        throw new Error(
          `Unsupported storage type: ${storageType}. Supported types: postgres, mysql, sqlite, github, json`,
        );
    }
  }

  /**
   * Create PostgreSQL storage configuration
   */
  private createPostgreSQLConfig(): StorageConfig {
    let connectionString = process.env.POSTGRES_URL;

    // If no connection string provided, try to build from individual parameters
    if (!connectionString) {
      connectionString = this.buildPostgreSQLConnectionString() || undefined;
    }

    if (!connectionString) {
      throw new Error(
        'PostgreSQL connection not configured. Set POSTGRES_URL or individual parameters (POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DATABASE).',
      );
    }

    const options: PostgreSQLStorageOptions = {
      ssl: this.parseSSLConfig(process.env.POSTGRES_SSL),
      connectionTimeoutMillis: this.parseNumber(process.env.POSTGRES_CONNECTION_TIMEOUT, 15000),
      idleTimeoutMillis: this.parseNumber(process.env.POSTGRES_IDLE_TIMEOUT, 30000),
      max: this.parseNumber(process.env.POSTGRES_MAX_CONNECTIONS, 20),
      application_name: process.env.POSTGRES_APP_NAME || 'devlog',
      statement_timeout: this.parseNumber(process.env.POSTGRES_STATEMENT_TIMEOUT, 0),
    };

    return {
      type: 'postgres',
      connectionString,
      options,
    };
  }

  /**
   * Create MySQL storage configuration
   */
  private createMySQLConfig(): StorageConfig {
    let connectionString = process.env.MYSQL_URL;

    // If no connection string provided, try to build from individual parameters
    if (!connectionString) {
      connectionString = this.buildMySQLConnectionString() || undefined;
    }

    if (!connectionString) {
      throw new Error(
        'MySQL connection not configured. Set MYSQL_URL or individual parameters (MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE).',
      );
    }

    const options: MySQLStorageOptions = {
      connectionLimit: this.parseNumber(process.env.MYSQL_CONNECTION_LIMIT, 20),
      acquireTimeout: this.parseNumber(process.env.MYSQL_ACQUIRE_TIMEOUT, 30000),
      timeout: this.parseNumber(process.env.MYSQL_TIMEOUT, 15000),
      reconnect: this.parseBoolean(process.env.MYSQL_RECONNECT, true),
      charset: process.env.MYSQL_CHARSET || 'utf8mb4',
      timezone: process.env.MYSQL_TIMEZONE || 'local',
      multipleStatements: this.parseBoolean(process.env.MYSQL_MULTIPLE_STATEMENTS, false),
    };

    return {
      type: 'mysql',
      connectionString,
      options,
    };
  }

  /**
   * Create SQLite storage configuration
   */
  private createSQLiteConfig(): StorageConfig {
    const connectionString =
      process.env.SQLITE_URL || process.env.SQLITE_PATH || '.devlog/database.sqlite';

    const options: SQLiteStorageOptions = {
      enableWAL: this.parseBoolean(process.env.SQLITE_ENABLE_WAL, true),
      busyTimeout: this.parseNumber(process.env.SQLITE_BUSY_TIMEOUT, 5000),
      foreignKeys: this.parseBoolean(process.env.SQLITE_FOREIGN_KEYS, true),
      journalMode: this.parseJournalMode(process.env.SQLITE_JOURNAL_MODE, 'WAL'),
      synchronous: this.parseSynchronousMode(process.env.SQLITE_SYNCHRONOUS, 'NORMAL'),
      cacheSize: this.parseNumber(process.env.SQLITE_CACHE_SIZE, 2000),
    };

    return {
      type: 'sqlite',
      connectionString,
      options,
    };
  }

  /**
   * Create GitHub storage configuration
   */
  private createGitHubConfig(): StorageConfig {
    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER;
    const githubRepo = process.env.GITHUB_REPO;

    if (!githubToken || !githubOwner || !githubRepo) {
      throw new Error(
        'GitHub storage requires GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO environment variables.',
      );
    }

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
          projectId: process.env.GITHUB_PROJECT_ID
            ? parseInt(process.env.GITHUB_PROJECT_ID, 10)
            : undefined,
        },
        rateLimit: {
          requestsPerHour: this.parseNumber(process.env.GITHUB_RATE_LIMIT_PER_HOUR, 4000),
          retryDelay: this.parseNumber(process.env.GITHUB_RETRY_DELAY, 1000),
          maxRetries: this.parseNumber(process.env.GITHUB_MAX_RETRIES, 3),
        },
        cache: {
          enabled: this.parseBoolean(process.env.GITHUB_CACHE_ENABLED, true),
          ttl: this.parseNumber(process.env.GITHUB_CACHE_TTL, 300000),
        },
      },
    };
  }

  /**
   * Create JSON storage configuration
   */
  private createJsonConfig(): StorageConfig {
    const options: JsonStorageOptions = {
      pretty: this.parseBoolean(process.env.DEVLOG_JSON_PRETTY, true),
      indent: this.parseNumber(process.env.DEVLOG_JSON_INDENT, 2),
      backup: this.parseBoolean(process.env.DEVLOG_JSON_BACKUP, false),
      encoding: this.parseEncoding(process.env.DEVLOG_JSON_ENCODING, 'utf8'),
      atomic: this.parseBoolean(process.env.DEVLOG_JSON_ATOMIC, true),
    };

    return {
      type: 'json',
      json: {
        directory: process.env.DEVLOG_JSON_DIRECTORY || '.devlog',
        filePattern: process.env.DEVLOG_JSON_FILE_PATTERN || '{id:auto}-{slug}.json',
        minPadding: this.parseNumber(process.env.DEVLOG_JSON_MIN_PADDING, 3),
        global: this.parseBoolean(process.env.DEVLOG_JSON_GLOBAL, false),
      },
      options,
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
   * Build PostgreSQL connection string from individual parameters
   */
  private buildPostgreSQLConnectionString(): string | null {
    const host = process.env.POSTGRES_HOST;
    const port = process.env.POSTGRES_PORT;
    const database = process.env.POSTGRES_DATABASE || process.env.POSTGRES_DB;
    const username = process.env.POSTGRES_USER || process.env.POSTGRES_USERNAME;
    const password = process.env.POSTGRES_PASSWORD;

    // Check if we have minimum required parameters
    if (!host || !username || !database) {
      return null;
    }

    // Build connection string
    const portPart = port ? `:${port}` : ':5432';
    const passwordPart = password ? `:${encodeURIComponent(password)}` : '';

    return `postgresql://${encodeURIComponent(username)}${passwordPart}@${host}${portPart}/${encodeURIComponent(database)}`;
  }

  /**
   * Build MySQL connection string from individual parameters
   */
  private buildMySQLConnectionString(): string | null {
    const host = process.env.MYSQL_HOST;
    const port = process.env.MYSQL_PORT;
    const database = process.env.MYSQL_DATABASE || process.env.MYSQL_DB;
    const username = process.env.MYSQL_USER || process.env.MYSQL_USERNAME;
    const password = process.env.MYSQL_PASSWORD;

    // Check if we have minimum required parameters
    if (!host || !username || !database) {
      return null;
    }

    // Build connection string
    const portPart = port ? `:${port}` : ':3306';
    const passwordPart = password ? `:${encodeURIComponent(password)}` : '';

    return `mysql://${encodeURIComponent(username)}${passwordPart}@${host}${portPart}/${encodeURIComponent(database)}`;
  }

  /**
   * Parse a number value from environment variable
   */
  private parseNumber(value: string | undefined, defaultValue: number): number {
    if (value === undefined) {
      return defaultValue;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Parse SSL configuration from environment variable
   */
  private parseSSLConfig(value: string | undefined): boolean | object {
    if (value === undefined || value.toLowerCase() === 'false') {
      return false;
    }
    if (value.toLowerCase() === 'true') {
      return process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : true;
    }

    try {
      return JSON.parse(value);
    } catch {
      // If parsing fails, default to production-safe SSL config
      return process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : true;
    }
  }

  /**
   * Parse SQLite journal mode from environment variable
   */
  private parseJournalMode(
    value: string | undefined,
    defaultValue: 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'WAL',
  ): 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'WAL' {
    if (value === undefined) {
      return defaultValue;
    }
    const validModes = ['DELETE', 'TRUNCATE', 'PERSIST', 'MEMORY', 'WAL'];
    const upperValue = value.toUpperCase();
    return validModes.includes(upperValue) ? (upperValue as any) : defaultValue;
  }

  /**
   * Parse SQLite synchronous mode from environment variable
   */
  private parseSynchronousMode(
    value: string | undefined,
    defaultValue: 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA',
  ): 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA' {
    if (value === undefined) {
      return defaultValue;
    }
    const validModes = ['OFF', 'NORMAL', 'FULL', 'EXTRA'];
    const upperValue = value.toUpperCase();
    return validModes.includes(upperValue) ? (upperValue as any) : defaultValue;
  }

  /**
   * Parse encoding from environment variable
   */
  private parseEncoding(
    value: string | undefined,
    defaultValue: 'utf8' | 'utf16le' | 'latin1',
  ): 'utf8' | 'utf16le' | 'latin1' {
    if (value === undefined) {
      return defaultValue;
    }
    const validEncodings = ['utf8', 'utf16le', 'latin1'];
    return validEncodings.includes(value) ? (value as any) : defaultValue;
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
