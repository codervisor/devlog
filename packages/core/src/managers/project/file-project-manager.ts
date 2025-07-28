/**
 * Simplified Project Manager
 *
 * Manages projects without per-project storage configuration.
 * Uses centralized application storage configuration instead.
 */

import { promises as fs } from 'fs';
import { dirname } from 'path';
import type {
  ProjectContext,
  ProjectManager,
  ProjectMetadata,
  ProjectsConfig,
} from '../../types/project.js';

export interface ProjectManagerOptions {
  /** Path to the projects configuration file */
  configPath: string;

  /** Whether to create config file if it doesn't exist */
  createIfMissing?: boolean;

  /** Default project configuration for auto-creation */
  defaultProjectConfig?: Omit<ProjectMetadata, 'id' | 'createdAt' | 'lastAccessedAt'>;
}

/**
 * File-based project manager implementation (simplified)
 */
export class FileProjectManager implements ProjectManager {
  private config: ProjectsConfig | null = null;
  private currentProjectId: string | null = null;

  constructor(private options: ProjectManagerOptions) {}

  /**
   * Load projects configuration from file
   */
  private async loadConfig(): Promise<ProjectsConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      const content = await fs.readFile(this.options.configPath, 'utf-8');
      const parsedConfig: ProjectsConfig = JSON.parse(content, (key, value) => {
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
      throw new Error(`Failed to load projects configuration: ${(error as Error).message}`);
    }
  }

  /**
   * Save projects configuration to file
   */
  private async saveConfig(config: ProjectsConfig): Promise<void> {
    // Ensure directory exists
    await fs.mkdir(dirname(this.options.configPath), { recursive: true });

    // Save with pretty formatting
    const content = JSON.stringify(config, null, 2);
    await fs.writeFile(this.options.configPath, content, 'utf-8');
    this.config = config;
  }

  /**
   * Create default configuration with a default project
   */
  private async createDefaultConfig(): Promise<ProjectsConfig> {
    const defaultProjectId = 'default';
    const now = new Date();

    const defaultProject: ProjectMetadata = {
      id: defaultProjectId,
      name: 'Default Project',
      description: 'Default devlog project',
      createdAt: now,
      lastAccessedAt: now,
      settings: {
        defaultPriority: 'medium',
      },
      tags: [],
    };

    // Apply custom default project config if provided
    if (this.options.defaultProjectConfig) {
      Object.assign(defaultProject, this.options.defaultProjectConfig);
      defaultProject.id = defaultProjectId;
      defaultProject.createdAt = now;
      defaultProject.lastAccessedAt = now;
    }

    const config: ProjectsConfig = {
      defaultProject: defaultProjectId,
      projects: {
        [defaultProjectId]: defaultProject,
      },
      globalSettings: {
        allowDynamicProjects: true,
        maxProjects: 20,
      },
    };

    await this.saveConfig(config);
    return config;
  }

  async listProjects(): Promise<ProjectMetadata[]> {
    const config = await this.loadConfig();
    return Object.values(config.projects);
  }

  async getProject(id: string): Promise<ProjectMetadata | null> {
    const config = await this.loadConfig();
    const project = config.projects[id];

    if (!project) {
      return null;
    }

    // Update last accessed time
    project.lastAccessedAt = new Date();
    await this.saveConfig(config);

    return project;
  }

  async createProject(
    project: Omit<ProjectMetadata, 'createdAt' | 'lastAccessedAt'>,
  ): Promise<ProjectMetadata> {
    const config = await this.loadConfig();

    // Check if project already exists
    if (config.projects[project.id]) {
      throw new Error(`Project '${project.id}' already exists`);
    }

    // Check project limits
    const projectCount = Object.keys(config.projects).length;
    if (config.globalSettings?.maxProjects && projectCount >= config.globalSettings.maxProjects) {
      throw new Error(`Maximum number of projects (${config.globalSettings.maxProjects}) reached`);
    }

    // Validate project ID pattern
    if (config.globalSettings?.namingPattern) {
      const pattern = new RegExp(config.globalSettings.namingPattern);
      if (!pattern.test(project.id)) {
        throw new Error(
          `Project ID '${project.id}' does not match required pattern: ${config.globalSettings.namingPattern}`,
        );
      }
    }

    const now = new Date();
    const newProject: ProjectMetadata = {
      ...project,
      createdAt: now,
      lastAccessedAt: now,
      tags: project.tags || [],
    };

    config.projects[project.id] = newProject;
    await this.saveConfig(config);
    return newProject;
  }

  async updateProject(id: string, updates: Partial<ProjectMetadata>): Promise<ProjectMetadata> {
    const config = await this.loadConfig();
    const project = config.projects[id];

    if (!project) {
      throw new Error(`Project '${id}' not found`);
    }

    // Prevent changing project ID
    if (updates.id && updates.id !== id) {
      throw new Error('Cannot change project ID');
    }

    // Update project info
    Object.assign(project, updates);
    project.lastAccessedAt = new Date();

    await this.saveConfig(config);
    return project;
  }

  async deleteProject(id: string): Promise<void> {
    const config = await this.loadConfig();

    if (!config.projects[id]) {
      throw new Error(`Project '${id}' not found`);
    }

    // Prevent deleting the default project
    if (id === config.defaultProject) {
      throw new Error('Cannot delete the default project');
    }

    delete config.projects[id];

    // If this was the current project, reset to default
    if (this.currentProjectId === id) {
      this.currentProjectId = null;
    }

    await this.saveConfig(config);
  }

  async getDefaultProject(): Promise<string> {
    const config = await this.loadConfig();
    return config.defaultProject;
  }

  async setDefaultProject(id: string): Promise<void> {
    const config = await this.loadConfig();

    if (!config.projects[id]) {
      throw new Error(`Project '${id}' not found`);
    }

    config.defaultProject = id;
    await this.saveConfig(config);
  }

  async switchToProject(id: string): Promise<ProjectContext> {
    const config = await this.loadConfig();
    const project = config.projects[id];

    if (!project) {
      throw new Error(`Project '${id}' not found`);
    }

    // Update last accessed time
    project.lastAccessedAt = new Date();
    await this.saveConfig(config);

    // Set as current project
    this.currentProjectId = id;

    return {
      projectId: id,
      project,
      isDefault: id === config.defaultProject,
    };
  }

  async getCurrentProject(): Promise<ProjectContext | null> {
    const config = await this.loadConfig();

    let projectId = this.currentProjectId;

    // Fall back to default project if no current project set
    if (!projectId) {
      projectId = config.defaultProject;
    }

    const project = config.projects[projectId];
    if (!project) {
      return null;
    }

    return {
      projectId,
      project,
      isDefault: projectId === config.defaultProject,
    };
  }
}
