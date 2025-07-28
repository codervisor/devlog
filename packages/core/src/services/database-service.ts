/**
 * DatabaseService - Simplified database connection management
 *
 * Replaces complex storage factory with direct TypeORM DataSource management.
 * Handles the lifecycle of database connections for the application.
 */

import { DataSource } from 'typeorm';
import {
  createDataSource,
  parseTypeORMConfig,
  type TypeORMStorageOptions,
} from '../storage/typeorm/typeorm-config.js';

export interface DatabaseServiceOptions {
  /** Override for database configuration */
  config?: TypeORMStorageOptions;

  /** Whether to auto-initialize on creation */
  autoInitialize?: boolean;
}

/**
 * DatabaseService - Single DataSource management for the application
 */
export class DatabaseService {
  private dataSource: DataSource | null = null;
  private initPromise: Promise<void> | null = null;
  private config: TypeORMStorageOptions;

  constructor(private options: DatabaseServiceOptions = {}) {
    // Use provided config or parse from environment
    this.config = options.config || parseTypeORMConfig();

    if (options.autoInitialize) {
      void this.initialize();
    }
  }

  /**
   * Initialize the database connection
   * Protects against race conditions during concurrent initialization
   */
  async initialize(): Promise<void> {
    // If initialization is in progress, wait for it
    if (this.initPromise) {
      console.log('⏳ DatabaseService initialization in progress, waiting...');
      return this.initPromise;
    }

    console.log('🚀 Initializing DatabaseService...');

    // Create initialization promise to prevent race conditions
    this.initPromise = this.performInitialization();

    try {
      await this.initPromise;
    } catch (error) {
      // Clear promise on failure so next call can retry
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Internal method to perform the actual initialization
   */
  private async performInitialization(): Promise<void> {
    try {
      console.log(`💾 Database type: ${this.config.type}`);

      // Create DataSource from configuration
      this.dataSource = createDataSource(this.config);

      // Initialize the connection if not already done
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
        console.log('✅ Database connection initialized');
      } else {
        console.log('✅ Database connection already initialized');
      }

      console.log('✅ DatabaseService initialized successfully');
    } catch (error) {
      console.error('❌ DatabaseService initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get the database connection
   * Automatically initializes if not already done
   */
  async getDatabase(): Promise<DataSource> {
    if (!this.dataSource) {
      await this.initialize();
    }
    return this.dataSource!;
  }

  /**
   * Check if the database is initialized and connected
   */
  isInitialized(): boolean {
    return this.dataSource?.isInitialized ?? false;
  }

  /**
   * Get the current database configuration
   */
  getConfig(): TypeORMStorageOptions {
    return { ...this.config };
  }

  /**
   * Update the database configuration
   * Note: This will require reinitialization to take effect
   */
  updateConfig(config: Partial<TypeORMStorageOptions>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Close the database connection
   */
  async dispose(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      console.log('🔄 Closing database connection...');
      await this.dataSource.destroy();
      console.log('✅ Database connection closed');
    }

    this.dataSource = null;
    this.initPromise = null;
  }

  /**
   * Test the database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const db = await this.getDatabase();
      await db.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Get database connection statistics for debugging
   */
  getConnectionStats(): {
    isInitialized: boolean;
    type: string;
    isConnected?: boolean;
  } {
    return {
      isInitialized: this.isInitialized(),
      type: this.config.type,
      isConnected: this.dataSource?.isInitialized,
    };
  }
}
