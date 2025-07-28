/**
 * Auto Project Manager with Centralized Storage
 *
 * Automatically selects between file and database storage for project management
 * while using centralized application storage configuration for devlog data.
 */

import { homedir } from 'os';
import { join } from 'path';
import type { ProjectContext, ProjectManager, ProjectMetadata } from '../../types/project.js';
import { AppConfigManager } from '../configuration/app-config-manager.js';
import { FileProjectManager, type ProjectManagerOptions } from './file-project-manager.js';
import {
  DatabaseProjectManager,
  type DatabaseProjectManagerOptions,
} from './database-project-manager.js';
import { parseTypeORMConfig, createDataSource } from '../../storage/typeorm/typeorm-config.js';
import { ProjectEntity } from '../../entities/project.entity.js';

export interface AutoProjectManagerOptions {
  /** Preferred storage type for project metadata: 'file' | 'database' | 'auto' */
  projectStorageType?: 'file' | 'database' | 'auto';

  /** File-based project manager options */
  fileOptions?: ProjectManagerOptions;

  /** Database project manager options */
  databaseOptions?: Omit<DatabaseProjectManagerOptions, 'database'>;

  /** Default project configuration for auto-creation */
  defaultProjectConfig?: Omit<ProjectMetadata, 'id' | 'createdAt' | 'lastAccessedAt'>;

  /** Application config manager for centralized storage config */
  appConfigManager?: AppConfigManager;
}

/**
 * Auto-selecting project manager with centralized storage configuration
 */
export class AutoProjectManager implements ProjectManager {
  private projectManager: FileProjectManager | DatabaseProjectManager | null = null;
  private appConfigManager: AppConfigManager;
  private initialized = false;

  constructor(private options: AutoProjectManagerOptions = {}) {
    this.appConfigManager =
      options.appConfigManager ||
      new AppConfigManager({
        createIfMissing: true,
      });
  }

  /**
   * Initialize the project manager and application config
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize app config (centralized storage configuration)
    // This is separate from project storage

    const projectStorageType = this.determineProjectStorageType();

    if (projectStorageType === 'database') {
      this.projectManager = await this.createDatabaseProjectManager();
    } else {
      this.projectManager = await this.createFileProjectManager();
    }

    if ('initialize' in this.projectManager) {
      await this.projectManager.initialize();
    }

    this.initialized = true;
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    if (this.projectManager && 'dispose' in this.projectManager) {
      await (this.projectManager as any).dispose();
    }
    this.initialized = false;
  }

  /**
   * Get the centralized application storage configuration
   */
  async getAppStorageConfig() {
    return this.appConfigManager.getStorageConfig();
  }

  /**
   * Update the centralized application storage configuration
   */
  async updateAppStorageConfig(storageConfig: any) {
    return this.appConfigManager.updateStorageConfig(storageConfig);
  }

  /**
   * Determine which storage type to use for project metadata
   */
  private determineProjectStorageType(): 'file' | 'database' {
    if (this.options.projectStorageType === 'file') return 'file';
    if (this.options.projectStorageType === 'database') return 'database';

    // Auto-detection for project metadata storage
    // This is separate from devlog data storage configuration
    const hasPostgresUrl = !!process.env.POSTGRES_URL;
    const hasMysqlUrl = !!process.env.MYSQL_URL;
    const isVercel = !!process.env.VERCEL;
    const isProduction = process.env.NODE_ENV === 'production';

    // Use database for project metadata in cloud environments
    if (hasPostgresUrl || hasMysqlUrl || isVercel || isProduction) {
      return 'database';
    }

    return 'file';
  }

  /**
   * Create file-based project manager
   */
  private async createFileProjectManager(): Promise<FileProjectManager> {
    const defaultFileOptions: ProjectManagerOptions = {
      configPath: join(homedir(), '.devlog', 'projects.json'),
      createIfMissing: true,
      defaultProjectConfig: this.options.defaultProjectConfig,
    };

    const fileOptions = { ...defaultFileOptions, ...this.options.fileOptions };
    return new FileProjectManager(fileOptions);
  }

  /**
   * Create database-backed project manager
   */
  private async createDatabaseProjectManager(): Promise<DatabaseProjectManager> {
    const typeormConfig = parseTypeORMConfig();
    const dataSource = createDataSource(typeormConfig, [ProjectEntity]);

    const defaultDatabaseOptions: Omit<DatabaseProjectManagerOptions, 'database'> = {
      createDefaultIfMissing: true,
      maxProjects: 100,
      defaultProjectConfig: this.options.defaultProjectConfig,
    };

    const databaseOptions = {
      ...defaultDatabaseOptions,
      ...this.options.databaseOptions,
      database: dataSource,
    };

    return new DatabaseProjectManager(databaseOptions);
  }

  /**
   * Ensure manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.projectManager) {
      throw new Error('AutoProjectManager not initialized. Call initialize() first.');
    }
  }

  // Delegate all ProjectManager methods to the active manager

  async listProjects(): Promise<ProjectMetadata[]> {
    this.ensureInitialized();
    return this.projectManager!.listProjects();
  }

  async getProject(id: string): Promise<ProjectMetadata | null> {
    this.ensureInitialized();
    return this.projectManager!.getProject(id);
  }

  async createProject(
    project: Omit<ProjectMetadata, 'createdAt' | 'lastAccessedAt'>,
  ): Promise<ProjectMetadata> {
    this.ensureInitialized();
    return this.projectManager!.createProject(project);
  }

  async updateProject(id: string, updates: Partial<ProjectMetadata>): Promise<ProjectMetadata> {
    this.ensureInitialized();
    return this.projectManager!.updateProject(id, updates);
  }

  async deleteProject(id: string): Promise<void> {
    this.ensureInitialized();
    return this.projectManager!.deleteProject(id);
  }

  async getDefaultProject(): Promise<string> {
    this.ensureInitialized();
    return this.projectManager!.getDefaultProject();
  }

  async setDefaultProject(id: string): Promise<void> {
    this.ensureInitialized();
    return this.projectManager!.setDefaultProject(id);
  }

  async switchToProject(id: string): Promise<ProjectContext> {
    this.ensureInitialized();
    return this.projectManager!.switchToProject(id);
  }

  async getCurrentProject(): Promise<ProjectContext | null> {
    this.ensureInitialized();
    return this.projectManager!.getCurrentProject();
  }

  /**
   * Get information about the current project storage type
   */
  getProjectStorageInfo(): { type: 'file' | 'database'; manager: string } {
    this.ensureInitialized();

    if (this.projectManager instanceof DatabaseProjectManager) {
      return { type: 'database', manager: 'DatabaseProjectManager' };
    } else {
      return { type: 'file', manager: 'FileProjectManager' };
    }
  }
}
