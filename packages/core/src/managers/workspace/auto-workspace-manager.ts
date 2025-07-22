/**
 * Enhanced workspace manager with database support for cloud deployments
 * Provides automatic selection between file-based and database-backed storage
 */

import { homedir } from 'os';
import { join } from 'path';
import type {
  StorageConfig,
  WorkspaceConfiguration,
  WorkspaceContext,
  WorkspaceManager,
  WorkspaceMetadata,
} from '../../types/index.js';
import {
  DatabaseWorkspaceManager,
  type DatabaseWorkspaceManagerOptions,
} from './database-workspace-manager.js';
import { FileWorkspaceManager, type WorkspaceManagerOptions } from './workspace-manager.js';
import { parseTypeORMConfig } from '../../storage/typeorm/typeorm-config.js';

export interface AutoWorkspaceManagerOptions {
  /** Preferred storage type: 'file' | 'database' | 'auto' */
  storageType?: 'file' | 'database' | 'auto';

  /** File-based workspace manager options */
  fileOptions?: WorkspaceManagerOptions;

  /** Database workspace manager options */
  databaseOptions?: Omit<DatabaseWorkspaceManagerOptions, 'database'>;

  /** Default workspace configuration for auto-creation */
  defaultWorkspaceConfig?: {
    workspace: Omit<WorkspaceMetadata, 'id' | 'createdAt' | 'lastAccessedAt'>;
    storage: StorageConfig;
  };
}

/**
 * Auto-selecting workspace manager that chooses between file and database storage
 * Based on environment configuration and deployment context
 */
export class AutoWorkspaceManager implements WorkspaceManager {
  private manager: FileWorkspaceManager | DatabaseWorkspaceManager | null = null;
  private initialized = false;

  constructor(private options: AutoWorkspaceManagerOptions = {}) {}

  /**
   * Initialize the appropriate workspace manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const storageType = this.determineStorageType();

    if (storageType === 'database') {
      this.manager = await this.createDatabaseManager();
    } else {
      this.manager = await this.createFileManager();
    }

    if ('initialize' in this.manager) {
      await this.manager.initialize();
    }
    this.initialized = true;
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    if (this.manager && 'dispose' in this.manager) {
      await (this.manager as any).dispose();
    }
    this.initialized = false;
  }

  /**
   * Determine which storage type to use
   */
  private determineStorageType(): 'file' | 'database' {
    if (this.options.storageType === 'file') return 'file';
    if (this.options.storageType === 'database') return 'database';

    // Check explicit storage type configuration first (highest priority)
    const explicitStorageType = process.env.DEVLOG_STORAGE_TYPE?.toLowerCase();
    if (explicitStorageType) {
      if (explicitStorageType === 'json') {
        return 'file';
      }
      if (['postgres', 'postgresql', 'mysql', 'sqlite'].includes(explicitStorageType)) {
        return 'database';
      }
    }

    // Auto-detection logic (fallback when no explicit type is set)
    const hasPostgresUrl = !!process.env.POSTGRES_URL;
    const hasMysqlUrl = !!process.env.MYSQL_URL;
    const isVercel = !!process.env.VERCEL;
    const isProduction = process.env.NODE_ENV === 'production';

    // Use database if:
    // 1. Database URLs are available
    // 2. Running on Vercel (ephemeral filesystem)
    // 3. Production environment with database config
    if (
      hasPostgresUrl ||
      hasMysqlUrl ||
      isVercel ||
      (isProduction && (hasPostgresUrl || hasMysqlUrl))
    ) {
      return 'database';
    }

    return 'file';
  }

  /**
   * Create file-based workspace manager
   */
  private async createFileManager(): Promise<FileWorkspaceManager> {
    const defaultFileOptions: WorkspaceManagerOptions = {
      configPath: join(homedir(), '.devlog', 'workspaces.json'),
      createIfMissing: true,
      defaultWorkspaceConfig: this.options.defaultWorkspaceConfig,
    };

    const fileOptions = { ...defaultFileOptions, ...this.options.fileOptions };
    return new FileWorkspaceManager(fileOptions);
  }

  /**
   * Create database-backed workspace manager
   */
  private async createDatabaseManager(): Promise<DatabaseWorkspaceManager> {
    const databaseConfig = parseTypeORMConfig();

    const defaultDatabaseOptions: Omit<DatabaseWorkspaceManagerOptions, 'database'> = {
      createDefaultIfMissing: true,
      maxWorkspaces: 50,
      defaultWorkspaceConfig: this.options.defaultWorkspaceConfig,
    };

    const databaseOptions = {
      ...defaultDatabaseOptions,
      ...this.options.databaseOptions,
      database: databaseConfig,
    };

    return new DatabaseWorkspaceManager(databaseOptions);
  }

  /**
   * Ensure manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.manager) {
      throw new Error('AutoWorkspaceManager not initialized. Call initialize() first.');
    }
  }

  // Delegate all WorkspaceManager methods to the active manager

  async listWorkspaces(): Promise<WorkspaceMetadata[]> {
    this.ensureInitialized();
    return this.manager!.listWorkspaces();
  }

  async getWorkspace(id: string): Promise<WorkspaceMetadata | null> {
    this.ensureInitialized();
    return this.manager!.getWorkspace(id);
  }

  async createWorkspace(
    workspace: Omit<WorkspaceMetadata, 'createdAt' | 'lastAccessedAt'>,
    storage: StorageConfig,
  ): Promise<WorkspaceMetadata> {
    this.ensureInitialized();
    return this.manager!.createWorkspace(workspace, storage);
  }

  async updateWorkspace(
    id: string,
    updates: Partial<WorkspaceMetadata>,
  ): Promise<WorkspaceMetadata> {
    this.ensureInitialized();
    return this.manager!.updateWorkspace(id, updates);
  }

  async deleteWorkspace(id: string): Promise<void> {
    this.ensureInitialized();
    return this.manager!.deleteWorkspace(id);
  }

  async getDefaultWorkspace(): Promise<string> {
    this.ensureInitialized();
    return this.manager!.getDefaultWorkspace();
  }

  async setDefaultWorkspace(id: string): Promise<void> {
    this.ensureInitialized();
    return this.manager!.setDefaultWorkspace(id);
  }

  async switchToWorkspace(id: string): Promise<WorkspaceContext> {
    this.ensureInitialized();
    return this.manager!.switchToWorkspace(id);
  }

  async getCurrentWorkspace(): Promise<WorkspaceContext | null> {
    this.ensureInitialized();
    return this.manager!.getCurrentWorkspace();
  }

  async getWorkspaceConfig(id: string): Promise<WorkspaceConfiguration | null> {
    this.ensureInitialized();
    return this.manager!.getWorkspaceConfig(id);
  }

  async getWorkspaceStorage(id: string): Promise<StorageConfig | null> {
    this.ensureInitialized();
    return this.manager!.getWorkspaceStorage(id);
  }

  /**
   * Get information about the current storage type
   */
  getStorageInfo(): { type: 'file' | 'database'; manager: string } {
    this.ensureInitialized();

    if (this.manager instanceof DatabaseWorkspaceManager) {
      return { type: 'database', manager: 'DatabaseWorkspaceManager' };
    } else {
      return { type: 'file', manager: 'FileWorkspaceManager' };
    }
  }
}
