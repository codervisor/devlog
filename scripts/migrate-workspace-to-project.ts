#!/usr/bin/env node

/**
 * Migration Script: Workspace → Project Refactoring
 * 
 * Migrates existing workspace configurations to the new project system
 * with centralized storage configuration.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface OldWorkspaceMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  lastAccessedAt: Date;
  settings?: Record<string, any>;
}

interface OldWorkspaceConfiguration {
  workspace: OldWorkspaceMetadata;
  storage: any; // We'll extract this for the centralized config
}

interface OldWorkspacesConfig {
  defaultWorkspace: string;
  workspaces: Record<string, OldWorkspaceConfiguration>;
  globalSettings?: Record<string, any>;
}

interface NewProjectMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  lastAccessedAt: Date;
  settings?: Record<string, any>;
  repositoryUrl?: string;
  tags: string[];
}

interface NewProjectsConfig {
  defaultProject: string;
  projects: Record<string, NewProjectMetadata>;
  globalSettings?: Record<string, any>;
}

interface NewAppStorageConfig {
  storage: any;
  cache?: {
    enabled: boolean;
    type: 'memory' | 'redis';
    ttl?: number;
  };
}

export class WorkspaceToProjectMigrator {
  private workspacesConfigPath: string;
  private projectsConfigPath: string;
  private appConfigPath: string;

  constructor() {
    const devlogDir = join(homedir(), '.devlog');
    this.workspacesConfigPath = join(devlogDir, 'workspaces.json');
    this.projectsConfigPath = join(devlogDir, 'projects.json');
    this.appConfigPath = join(devlogDir, 'app-config.json');
  }

  async migrate(): Promise<void> {
    console.log('🚀 Starting Workspace → Project migration...');

    try {
      // Check if workspace config exists
      const workspaceConfigExists = await this.fileExists(this.workspacesConfigPath);
      if (!workspaceConfigExists) {
        console.log('ℹ️  No workspace configuration found. Nothing to migrate.');
        return;
      }

      // Check if projects config already exists
      const projectConfigExists = await this.fileExists(this.projectsConfigPath);
      if (projectConfigExists) {
        console.log('⚠️  Projects configuration already exists. Skipping migration.');
        console.log('   If you want to re-run the migration, please backup and remove:');
        console.log(`   - ${this.projectsConfigPath}`);
        console.log(`   - ${this.appConfigPath}`);
        return;
      }

      // Load old workspace configuration
      console.log('📖 Loading workspace configuration...');
      const workspacesConfig = await this.loadWorkspacesConfig();

      // Migrate to projects configuration
      console.log('🔄 Converting workspaces to projects...');
      const projectsConfig = this.convertToProjectsConfig(workspacesConfig);

      // Create centralized app storage configuration
      console.log('🏗️  Creating centralized storage configuration...');
      const appStorageConfig = this.createAppStorageConfig(workspacesConfig);

      // Save new configurations
      console.log('💾 Saving new configurations...');
      await this.saveProjectsConfig(projectsConfig);
      await this.saveAppStorageConfig(appStorageConfig);

      // Backup old workspace config
      console.log('🔄 Backing up old workspace configuration...');
      await this.backupWorkspaceConfig();

      console.log('✅ Migration completed successfully!');
      console.log('');
      console.log('📁 New files created:');
      console.log(`   - ${this.projectsConfigPath}`);
      console.log(`   - ${this.appConfigPath}`);
      console.log(`   - ${this.workspacesConfigPath}.backup`);
      console.log('');
      console.log('🔧 Next steps:');
      console.log('   1. Update your application to use the new project-based APIs');
      console.log('   2. Test the new configuration');
      console.log('   3. Remove the old workspace configuration backup when satisfied');

    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  private async loadWorkspacesConfig(): Promise<OldWorkspacesConfig> {
    const content = await fs.readFile(this.workspacesConfigPath, 'utf-8');
    return JSON.parse(content, (key, value) => {
      if (key === 'createdAt' || key === 'lastAccessedAt') {
        return new Date(value);
      }
      return value;
    });
  }

  private convertToProjectsConfig(workspacesConfig: OldWorkspacesConfig): NewProjectsConfig {
    const projects: Record<string, NewProjectMetadata> = {};

    for (const [workspaceId, workspaceConfig] of Object.entries(workspacesConfig.workspaces)) {
      const oldWorkspace = workspaceConfig.workspace;
      
      const newProject: NewProjectMetadata = {
        id: oldWorkspace.id,
        name: oldWorkspace.name,
        description: oldWorkspace.description,
        createdAt: oldWorkspace.createdAt,
        lastAccessedAt: oldWorkspace.lastAccessedAt,
        settings: oldWorkspace.settings,
        tags: [], // New field
        // repositoryUrl could be extracted from workspace settings if available
      };

      // Try to extract repository URL from workspace settings
      if (oldWorkspace.settings?.repositoryUrl) {
        newProject.repositoryUrl = oldWorkspace.settings.repositoryUrl;
      }

      projects[workspaceId] = newProject;
    }

    return {
      defaultProject: workspacesConfig.defaultWorkspace,
      projects,
      globalSettings: {
        ...workspacesConfig.globalSettings,
        // Update property names
        allowDynamicProjects: workspacesConfig.globalSettings?.allowDynamicWorkspaces,
        maxProjects: workspacesConfig.globalSettings?.maxWorkspaces,
      },
    };
  }

  private createAppStorageConfig(workspacesConfig: OldWorkspacesConfig): NewAppStorageConfig {
    // Extract storage configuration from the default workspace
    const defaultWorkspaceId = workspacesConfig.defaultWorkspace;
    const defaultWorkspace = workspacesConfig.workspaces[defaultWorkspaceId];
    
    let storageConfig = defaultWorkspace?.storage;

    // If no storage config found, use default JSON config
    if (!storageConfig) {
      storageConfig = {
        type: 'json',
        json: {
          directory: '.devlog',
          global: false,
        },
      };
    }

    return {
      storage: storageConfig,
      cache: {
        enabled: process.env.NODE_ENV === 'production',
        type: 'memory',
        ttl: 300000, // 5 minutes
      },
    };
  }

  private async saveProjectsConfig(config: NewProjectsConfig): Promise<void> {
    const content = JSON.stringify(config, null, 2);
    await fs.writeFile(this.projectsConfigPath, content, 'utf-8');
  }

  private async saveAppStorageConfig(config: NewAppStorageConfig): Promise<void> {
    const content = JSON.stringify(config, null, 2);
    await fs.writeFile(this.appConfigPath, content, 'utf-8');
  }

  private async backupWorkspaceConfig(): Promise<void> {
    const backupPath = `${this.workspacesConfigPath}.backup`;
    await fs.copyFile(this.workspacesConfigPath, backupPath);
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const migrator = new WorkspaceToProjectMigrator();
  migrator.migrate().catch(console.error);
}

export default WorkspaceToProjectMigrator;
