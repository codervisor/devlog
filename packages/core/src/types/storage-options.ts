/**
 * Storage configuration types for better type safety
 */

/**
 * MySQL storage provider options
 */
export interface MySQLStorageOptions {
  /** Connection pool options */
  connectionLimit?: number;
  /** Connection timeout in milliseconds */
  acquireTimeout?: number;
  /** Idle timeout in milliseconds */
  timeout?: number;
  /** Whether to reconnect automatically */
  reconnect?: boolean;
  /** Additional MySQL-specific options */
  charset?: string;
  timezone?: string;
  multipleStatements?: boolean;
}

/**
 * SQLite storage provider options
 */
export interface SQLiteStorageOptions {
  /** Whether to enable foreign key constraints */
  foreignKeys?: boolean;
  /** Journal mode for SQLite */
  journalMode?: 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'WAL';
  /** Synchronous mode for SQLite */
  synchronous?: 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA';
  /** Cache size in KB */
  cacheSize?: number;
  /** Busy timeout in milliseconds */
  busyTimeout?: number;
  /** Whether to enable WAL mode for better concurrency */
  enableWAL?: boolean;
}

/**
 * PostgreSQL storage provider options
 */
export interface PostgreSQLStorageOptions {
  /** Connection pool options */
  max?: number;
  /** Connection timeout in milliseconds */
  connectionTimeoutMillis?: number;
  /** Idle timeout in milliseconds */
  idleTimeoutMillis?: number;
  /** Whether to use SSL */
  ssl?: boolean | object;
  /** Application name for connection tracking */
  application_name?: string;
  /** Statement timeout in milliseconds */
  statement_timeout?: number;
}

/**
 * JSON file storage options
 */
export interface JsonStorageOptions {
  /** Whether to format JSON with indentation */
  pretty?: boolean;
  /** Number of spaces for indentation (if pretty is true) */
  indent?: number;
  /** Whether to create backup files */
  backup?: boolean;
  /** File encoding */
  encoding?: 'utf8' | 'utf16le' | 'latin1';
  /** Whether to use atomic writes */
  atomic?: boolean;
}
