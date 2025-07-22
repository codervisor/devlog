/**
 * Database-backed workspace manager for cloud deployments
 * Stores workspace metadata in PostgreSQL/MySQL/SQLite instead of local JSON files
 */

import { DataSource, Repository } from 'typeorm';
import type {
  WorkspaceManager,
  WorkspaceMetadata,
  WorkspaceConfiguration,
  WorkspacesConfig,
  WorkspaceContext,
  StorageConfig,
} from './types/index.js';
import { WorkspaceEntity } from './entities/workspace.entity.js';
import { createDataSource, type TypeORMStorageOptions } from './storage/typeorm/typeorm-config.js';

export interface DatabaseWorkspaceManagerOptions {
  /** Database connection configuration */
  database: TypeORMStorageOptions;
  
  /** Default workspace configuration for auto-creation */
  defaultWorkspaceConfig?: {
    workspace: Omit<WorkspaceMetadata, 'id' | 'createdAt' | 'lastAccessedAt'>;
    storage: StorageConfig;
  };
  
  /** Whether to create default workspace if none exist */
  createDefaultIfMissing?: boolean;
  
  /** Maximum number of workspaces allowed */
  maxWorkspaces?: number;
}

/**
 * Database-backed workspace manager implementation
 * Suitable for cloud deployments and multi-instance environments
 */
export class DatabaseWorkspaceManager implements WorkspaceManager {
  private dataSource: DataSource | null = null;
  private repository: Repository<WorkspaceEntity> | null = null;
  private currentWorkspaceId: string | null = null;
  private initialized = false;
  
  constructor(private options: DatabaseWorkspaceManagerOptions) {}
  
  /**
   * Initialize database connection and repository
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      this.dataSource = createDataSource(this.options.database, [WorkspaceEntity]);
      
      if (this.dataSource && !this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }
      
      if (!this.dataSource) {
        throw new Error('Failed to create database connection');
      }
      
      this.repository = this.dataSource.getRepository(WorkspaceEntity);
      
      // Create default workspace if none exist and option is enabled
      if (this.options.createDefaultIfMissing) {
        const count = await this.repository.count();
        if (count === 0) {
          await this.createDefaultWorkspace();
        }
      }
      
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize DatabaseWorkspaceManager: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Cleanup database connection
   */
  async dispose(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
    this.initialized = false;
  }
  
  /**
   * Ensure manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.repository) {
      throw new Error('DatabaseWorkspaceManager not initialized. Call initialize() first.');
    }
  }
  
  /**
   * Create default workspace configuration
   */
  private async createDefaultWorkspace(): Promise<void> {
    const defaultWorkspaceId = 'default';
    
    const defaultWorkspace: Omit<WorkspaceMetadata, 'createdAt' | 'lastAccessedAt'> = {
      id: defaultWorkspaceId,
      name: 'Default Workspace',
      description: 'Default devlog workspace',
      settings: {
        defaultPriority: 'medium'
      }
    };
    
    const defaultStorage: StorageConfig = this.options.defaultWorkspaceConfig?.storage || {
      type: 'json',
      json: {
        directory: '.devlog',
        global: false
      }
    };
    
    if (this.options.defaultWorkspaceConfig) {
      Object.assign(defaultWorkspace, this.options.defaultWorkspaceConfig.workspace);
      defaultWorkspace.id = defaultWorkspaceId;
    }
    
    await this.createWorkspace(defaultWorkspace, defaultStorage);
  }
  
  async listWorkspaces(): Promise<WorkspaceMetadata[]> {
    this.ensureInitialized();
    
    const entities = await this.repository!.find({
      order: { lastAccessedAt: 'DESC' }
    });
    
    return entities.map(entity => entity.toWorkspaceMetadata());
  }
  
  async getWorkspace(id: string): Promise<WorkspaceMetadata | null> {
    this.ensureInitialized();
    
    const entity = await this.repository!.findOne({ where: { id } });
    
    if (!entity) {
      return null;
    }
    
    // Update last accessed time
    entity.lastAccessedAt = new Date();
    await this.repository!.save(entity);
    
    return entity.toWorkspaceMetadata();
  }
  
  async createWorkspace(
    workspace: Omit<WorkspaceMetadata, 'createdAt' | 'lastAccessedAt'>,
    storage: StorageConfig
  ): Promise<WorkspaceMetadata> {
    this.ensureInitialized();
    
    // Check if workspace already exists
    const existing = await this.repository!.findOne({ where: { id: workspace.id } });
    if (existing) {
      throw new Error(`Workspace '${workspace.id}' already exists`);
    }
    
    // Check workspace limits
    if (this.options.maxWorkspaces) {
      const count = await this.repository!.count();
      if (count >= this.options.maxWorkspaces) {
        throw new Error(`Maximum number of workspaces (${this.options.maxWorkspaces}) reached`);
      }
    }
    
    const entity = WorkspaceEntity.fromWorkspaceData(workspace, storage);
    await this.repository!.save(entity);
    
    return entity.toWorkspaceMetadata();
  }
  
  async updateWorkspace(id: string, updates: Partial<WorkspaceMetadata>): Promise<WorkspaceMetadata> {
    this.ensureInitialized();
    
    const entity = await this.repository!.findOne({ where: { id } });
    if (!entity) {
      throw new Error(`Workspace '${id}' not found`);
    }
    
    // Prevent changing workspace ID
    if (updates.id && updates.id !== id) {
      throw new Error('Cannot change workspace ID');
    }
    
    entity.updateFromWorkspaceData(updates);
    await this.repository!.save(entity);
    
    return entity.toWorkspaceMetadata();
  }
  
  async deleteWorkspace(id: string): Promise<void> {
    this.ensureInitialized();
    
    const entity = await this.repository!.findOne({ where: { id } });
    if (!entity) {
      throw new Error(`Workspace '${id}' not found`);
    }
    
    // Prevent deleting the default workspace if it's the only one
    const count = await this.repository!.count();
    if (count === 1 && id === 'default') {
      throw new Error('Cannot delete the last remaining workspace');
    }
    
    await this.repository!.remove(entity);
    
    // Reset current workspace if this was it
    if (this.currentWorkspaceId === id) {
      this.currentWorkspaceId = null;
    }
  }
  
  async getDefaultWorkspace(): Promise<string> {
    this.ensureInitialized();
    
    // Check if 'default' workspace exists
    const defaultExists = await this.repository!.findOne({ where: { id: 'default' } });
    if (defaultExists) {
      return 'default';
    }
    
    // Return first workspace if no 'default' exists
    const firstWorkspace = await this.repository!.findOne({
      order: { createdAt: 'ASC' }
    });
    
    if (!firstWorkspace) {
      throw new Error('No workspaces found');
    }
    
    return firstWorkspace.id;
  }
  
  async setDefaultWorkspace(id: string): Promise<void> {
    this.ensureInitialized();
    
    const entity = await this.repository!.findOne({ where: { id } });
    if (!entity) {
      throw new Error(`Workspace '${id}' not found`);
    }
    
    // Note: In database implementation, we don't store a global "default" setting
    // Instead, we use naming convention ('default' workspace) or user preferences
    // This method exists for interface compatibility but is essentially a no-op
  }
  
  async switchToWorkspace(id: string): Promise<WorkspaceContext> {
    this.ensureInitialized();
    
    const entity = await this.repository!.findOne({ where: { id } });
    if (!entity) {
      throw new Error(`Workspace '${id}' not found`);
    }
    
    // Update last accessed time
    entity.lastAccessedAt = new Date();
    await this.repository!.save(entity);
    
    // Set as current workspace
    this.currentWorkspaceId = id;
    
    return {
      workspaceId: id,
      workspace: entity.toWorkspaceMetadata(),
      isDefault: id === 'default'
    };
  }
  
  async getCurrentWorkspace(): Promise<WorkspaceContext | null> {
    this.ensureInitialized();
    
    let workspaceId = this.currentWorkspaceId;
    
    // Fall back to default workspace if no current workspace set
    if (!workspaceId) {
      try {
        workspaceId = await this.getDefaultWorkspace();
      } catch {
        return null;
      }
    }
    
    const entity = await this.repository!.findOne({ where: { id: workspaceId } });
    if (!entity) {
      return null;
    }
    
    return {
      workspaceId,
      workspace: entity.toWorkspaceMetadata(),
      isDefault: workspaceId === 'default'
    };
  }
  
  /**
   * Get workspace configuration (including storage config)
   */
  async getWorkspaceConfig(id: string): Promise<WorkspaceConfiguration | null> {
    this.ensureInitialized();
    
    const entity = await this.repository!.findOne({ where: { id } });
    if (!entity) {
      return null;
    }
    
    return {
      workspace: entity.toWorkspaceMetadata(),
      storage: entity.storage
    };
  }
  
  /**
   * Get storage configuration for a workspace
   */
  async getWorkspaceStorage(id: string): Promise<StorageConfig | null> {
    this.ensureInitialized();
    
    const entity = await this.repository!.findOne({ where: { id } });
    if (!entity) {
      return null;
    }
    
    return entity.storage;
  }
}
