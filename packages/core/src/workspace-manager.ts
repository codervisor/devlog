/**
 * Workspace Manager Implementation
 * 
 * Manages multiple workspaces and their configurations, providing
 * isolation between different devlog contexts.
 */

import { promises as fs } from 'fs';
import { dirname } from 'path';
import {
    StorageConfig,
    WorkspaceMetadata,
    WorkspaceConfiguration,
    WorkspacesConfig,
    WorkspaceContext,
    WorkspaceManager
 } from './types/index.js';

export interface WorkspaceManagerOptions {
  /** Path to the workspaces configuration file */
  configPath: string;
  
  /** Whether to create config file if it doesn't exist */
  createIfMissing?: boolean;
  
  /** Default workspace configuration for auto-creation */
  defaultWorkspaceConfig?: {
    workspace: Omit<WorkspaceMetadata, 'id' | 'createdAt' | 'lastAccessedAt'>;
    storage: StorageConfig;
  };
}

/**
 * File-based workspace manager implementation
 */
export class FileWorkspaceManager implements WorkspaceManager {
  private config: WorkspacesConfig | null = null;
  private currentWorkspaceId: string | null = null;
  
  constructor(private options: WorkspaceManagerOptions) {}
  
  /**
   * Load workspaces configuration from file
   */
  private async loadConfig(): Promise<WorkspacesConfig> {
    if (this.config) {
      return this.config;
    }
    
    try {
      const content = await fs.readFile(this.options.configPath, 'utf-8');
      const parsedConfig: WorkspacesConfig = JSON.parse(content, (key, value) => {
        // Parse date strings back to Date objects
        if (key === 'createdAt' || key === 'lastAccessedAt') {
          return new Date(value);
        }
        return value;
      });
      this.config = parsedConfig;
      return parsedConfig;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT' && this.options.createIfMissing) {
        return this.createDefaultConfig();
      }
      throw new Error(`Failed to load workspace configuration: ${(error as Error).message}`);
    }
  }
  
  /**
   * Save workspaces configuration to file
   */
  private async saveConfig(config: WorkspacesConfig): Promise<void> {
    // Ensure directory exists
    await fs.mkdir(dirname(this.options.configPath), { recursive: true });
    
    // Save with pretty formatting and custom date serialization
    const content = JSON.stringify(config, null, 2);
    await fs.writeFile(this.options.configPath, content, 'utf-8');
    this.config = config;
  }
  
  /**
   * Create default configuration with a default workspace
   */
  private async createDefaultConfig(): Promise<WorkspacesConfig> {
    const defaultWorkspaceId = 'default';
    const now = new Date();
    
    const defaultWorkspace: WorkspaceMetadata = {
      id: defaultWorkspaceId,
      name: 'Default Workspace',
      description: 'Default devlog workspace',
      createdAt: now,
      lastAccessedAt: now,
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
      defaultWorkspace.createdAt = now;
      defaultWorkspace.lastAccessedAt = now;
    }
    
    const config: WorkspacesConfig = {
      defaultWorkspace: defaultWorkspaceId,
      workspaces: {
        [defaultWorkspaceId]: {
          workspace: defaultWorkspace,
          storage: defaultStorage
        }
      },
      globalSettings: {
        allowDynamicWorkspaces: true,
        maxWorkspaces: 10
      }
    };
    
    await this.saveConfig(config);
    return config;
  }
  
  async listWorkspaces(): Promise<WorkspaceMetadata[]> {
    const config = await this.loadConfig();
    return Object.values(config.workspaces).map(wc => wc.workspace);
  }
  
  async getWorkspace(id: string): Promise<WorkspaceMetadata | null> {
    const config = await this.loadConfig();
    const workspaceConfig = config.workspaces[id];
    
    if (!workspaceConfig) {
      return null;
    }
    
    // Update last accessed time
    workspaceConfig.workspace.lastAccessedAt = new Date();
    await this.saveConfig(config);
    
    return workspaceConfig.workspace;
  }
   async createWorkspace(
    workspace: Omit<WorkspaceMetadata, 'createdAt' | 'lastAccessedAt'>,
    storage: StorageConfig
  ): Promise<WorkspaceMetadata> {
    const config = await this.loadConfig();
    
    // Check if workspace already exists
    if (config.workspaces[workspace.id]) {
      throw new Error(`Workspace '${workspace.id}' already exists`);
    }
    
    // Check workspace limits
    const workspaceCount = Object.keys(config.workspaces).length;
    if (config.globalSettings?.maxWorkspaces && workspaceCount >= config.globalSettings.maxWorkspaces) {
      throw new Error(`Maximum number of workspaces (${config.globalSettings.maxWorkspaces}) reached`);
    }
    
    // Validate workspace ID pattern
    if (config.globalSettings?.namingPattern) {
      const pattern = new RegExp(config.globalSettings.namingPattern);
      if (!pattern.test(workspace.id)) {
        throw new Error(`Workspace ID '${workspace.id}' does not match required pattern: ${config.globalSettings.namingPattern}`);
      }
    }
    
    const now = new Date();
    const newWorkspace: WorkspaceMetadata = {
      ...workspace,
      createdAt: now,
      lastAccessedAt: now
    };
    
    config.workspaces[workspace.id] = {
      workspace: newWorkspace,
      storage
    };
    
    await this.saveConfig(config);
    return newWorkspace;
  }
  
  async updateWorkspace(id: string, updates: Partial<WorkspaceMetadata>): Promise<WorkspaceMetadata> {
    const config = await this.loadConfig();
    const workspaceConfig = config.workspaces[id];
    
    if (!workspaceConfig) {
      throw new Error(`Workspace '${id}' not found`);
    }
    
    // Prevent changing workspace ID
    if (updates.id && updates.id !== id) {
      throw new Error('Cannot change workspace ID');
    }
    
    // Update workspace info
    Object.assign(workspaceConfig.workspace, updates);
    workspaceConfig.workspace.lastAccessedAt = new Date();
    
    await this.saveConfig(config);
    return workspaceConfig.workspace;
  }
  
  async deleteWorkspace(id: string): Promise<void> {
    const config = await this.loadConfig();
    
    if (!config.workspaces[id]) {
      throw new Error(`Workspace '${id}' not found`);
    }
    
    // Prevent deleting the default workspace
    if (id === config.defaultWorkspace) {
      throw new Error('Cannot delete the default workspace');
    }
    
    delete config.workspaces[id];
    
    // If this was the current workspace, reset to default
    if (this.currentWorkspaceId === id) {
      this.currentWorkspaceId = null;
    }
    
    await this.saveConfig(config);
  }
  
  async getDefaultWorkspace(): Promise<string> {
    const config = await this.loadConfig();
    return config.defaultWorkspace;
  }
  
  async setDefaultWorkspace(id: string): Promise<void> {
    const config = await this.loadConfig();
    
    if (!config.workspaces[id]) {
      throw new Error(`Workspace '${id}' not found`);
    }
    
    config.defaultWorkspace = id;
    await this.saveConfig(config);
  }
  
  async switchToWorkspace(id: string): Promise<WorkspaceContext> {
    const config = await this.loadConfig();
    const workspaceConfig = config.workspaces[id];
    
    if (!workspaceConfig) {
      throw new Error(`Workspace '${id}' not found`);
    }
    
    // Update last accessed time
    workspaceConfig.workspace.lastAccessedAt = new Date();
    await this.saveConfig(config);
    
    // Set as current workspace
    this.currentWorkspaceId = id;
    
    return {
      workspaceId: id,
      workspace: workspaceConfig.workspace,
      isDefault: id === config.defaultWorkspace
    };
  }
  
  async getCurrentWorkspace(): Promise<WorkspaceContext | null> {
    const config = await this.loadConfig();
    
    let workspaceId = this.currentWorkspaceId;
    
    // Fall back to default workspace if no current workspace set
    if (!workspaceId) {
      workspaceId = config.defaultWorkspace;
    }
    
    const workspaceConfig = config.workspaces[workspaceId];
    if (!workspaceConfig) {
      return null;
    }
    
    return {
      workspaceId,
      workspace: workspaceConfig.workspace,
      isDefault: workspaceId === config.defaultWorkspace
    };
  }
  
  /**
   * Get workspace configuration (including storage config)
   */
  async getWorkspaceConfig(id: string): Promise<WorkspaceConfiguration | null> {
    const config = await this.loadConfig();
    return config.workspaces[id] || null;
  }
  
  /**
   * Get storage configuration for a workspace
   */
  async getWorkspaceStorage(id: string): Promise<StorageConfig | null> {
    const workspaceConfig = await this.getWorkspaceConfig(id);
    return workspaceConfig?.storage || null;
  }
}
