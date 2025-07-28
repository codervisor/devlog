/**
 * Database-backed Project Manager
 *
 * Manages projects using database storage without per-project storage configuration.
 * Uses the centralized application storage configuration.
 */

import { DataSource, Repository } from 'typeorm';
import type { ProjectContext, ProjectManager, ProjectMetadata } from '../../types/project.js';
import { ProjectEntity } from '../../entities/project.entity.js';

export interface DatabaseProjectManagerOptions {
  /** TypeORM database connection */
  database: DataSource;

  /** Whether to create default project if none exist */
  createDefaultIfMissing?: boolean;

  /** Maximum number of projects allowed */
  maxProjects?: number;

  /** Default project configuration for auto-creation */
  defaultProjectConfig?: Omit<ProjectMetadata, 'id' | 'createdAt' | 'lastAccessedAt'>;
}

/**
 * Database-backed project manager implementation
 */
export class DatabaseProjectManager implements ProjectManager {
  private repository: Repository<ProjectEntity>;
  private currentProjectId: string | null = null;
  private initialized = false;

  constructor(private options: DatabaseProjectManagerOptions) {
    this.repository = this.options.database.getRepository(ProjectEntity);
  }

  /**
   * Initialize the project manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure database connection is established
    if (!this.options.database.isInitialized) {
      await this.options.database.initialize();
    }

    // Create default project if none exist and option is enabled
    if (this.options.createDefaultIfMissing) {
      const projectCount = await this.repository.count();
      if (projectCount === 0) {
        await this.createDefaultProject();
      }
    }

    this.initialized = true;
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    if (this.options.database.isInitialized) {
      await this.options.database.destroy();
    }
    this.initialized = false;
  }

  /**
   * Create default project
   */
  private async createDefaultProject(): Promise<void> {
    const defaultProject: Omit<ProjectMetadata, 'createdAt' | 'lastAccessedAt'> = {
      id: 'default',
      name: 'Default Project',
      description: 'Default devlog project',
      settings: {
        defaultPriority: 'medium',
      },
      tags: [],
      ...this.options.defaultProjectConfig,
    };

    // Force the ID to be 'default' even if overridden
    defaultProject.id = 'default';

    await this.createProject(defaultProject);
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('DatabaseProjectManager not initialized. Call initialize() first.');
    }
  }

  async listProjects(): Promise<ProjectMetadata[]> {
    this.ensureInitialized();
    const entities = await this.repository.find({
      order: { lastAccessedAt: 'DESC' },
    });
    return entities.map((entity) => entity.toProjectMetadata());
  }

  async getProject(id: string): Promise<ProjectMetadata | null> {
    this.ensureInitialized();
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      return null;
    }

    // Update last accessed time
    entity.lastAccessedAt = new Date();
    await this.repository.save(entity);

    return entity.toProjectMetadata();
  }

  async createProject(
    project: Omit<ProjectMetadata, 'createdAt' | 'lastAccessedAt'>,
  ): Promise<ProjectMetadata> {
    this.ensureInitialized();

    // Check if project already exists
    const existing = await this.repository.findOne({ where: { id: project.id } });
    if (existing) {
      throw new Error(`Project '${project.id}' already exists`);
    }

    // Check project limits
    if (this.options.maxProjects) {
      const projectCount = await this.repository.count();
      if (projectCount >= this.options.maxProjects) {
        throw new Error(`Maximum number of projects (${this.options.maxProjects}) reached`);
      }
    }

    // Create and save new project entity
    const entity = ProjectEntity.fromProjectData(project);
    const savedEntity = await this.repository.save(entity);

    return savedEntity.toProjectMetadata();
  }

  async updateProject(id: string, updates: Partial<ProjectMetadata>): Promise<ProjectMetadata> {
    this.ensureInitialized();

    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      throw new Error(`Project '${id}' not found`);
    }

    // Prevent changing project ID
    if (updates.id && updates.id !== id) {
      throw new Error('Cannot change project ID');
    }

    // Update entity
    entity.updateFromProjectData(updates);
    const savedEntity = await this.repository.save(entity);

    return savedEntity.toProjectMetadata();
  }

  async deleteProject(id: string): Promise<void> {
    this.ensureInitialized();

    // Prevent deleting the default project
    if (id === 'default') {
      throw new Error('Cannot delete the default project');
    }

    const result = await this.repository.delete({ id });
    if (result.affected === 0) {
      throw new Error(`Project '${id}' not found`);
    }

    // If this was the current project, reset to default
    if (this.currentProjectId === id) {
      this.currentProjectId = null;
    }
  }

  async getDefaultProject(): Promise<string> {
    this.ensureInitialized();
    // For now, we'll use a simple default project approach
    // In the future, this could be stored in a settings table
    return 'default';
  }

  async setDefaultProject(id: string): Promise<void> {
    this.ensureInitialized();

    // Verify project exists
    const project = await this.repository.findOne({ where: { id } });
    if (!project) {
      throw new Error(`Project '${id}' not found`);
    }

    // For now, we'll keep the default as 'default'
    // In the future, this could be stored in a settings table
    if (id !== 'default') {
      throw new Error('Setting custom default project not yet supported in database mode');
    }
  }

  async switchToProject(id: string): Promise<ProjectContext> {
    this.ensureInitialized();

    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      throw new Error(`Project '${id}' not found`);
    }

    // Update last accessed time
    entity.lastAccessedAt = new Date();
    await this.repository.save(entity);

    // Set as current project
    this.currentProjectId = id;

    const project = entity.toProjectMetadata();
    return {
      projectId: id,
      project,
      isDefault: id === 'default',
    };
  }

  async getCurrentProject(): Promise<ProjectContext | null> {
    this.ensureInitialized();

    let projectId = this.currentProjectId;

    // Fall back to default project if no current project set
    if (!projectId) {
      projectId = await this.getDefaultProject();
    }

    const entity = await this.repository.findOne({ where: { id: projectId } });
    if (!entity) {
      return null;
    }

    const project = entity.toProjectMetadata();
    return {
      projectId,
      project,
      isDefault: projectId === 'default',
    };
  }
}
