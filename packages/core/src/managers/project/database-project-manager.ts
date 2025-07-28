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
  private currentProjectId: number | null = null;
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
    const defaultProject: Omit<ProjectMetadata, 'id' | 'createdAt' | 'lastAccessedAt'> = {
      name: 'Default Project',
      description: 'Default devlog project',
      settings: {
        defaultPriority: 'medium',
      },
      ...this.options.defaultProjectConfig,
    };

    // Create project directly without initialization check since this is called during initialization
    const existing = await this.repository.findOne({ where: { name: defaultProject.name } });
    if (existing) {
      return; // Default project already exists
    }

    // Check project limits
    if (this.options.maxProjects) {
      const projectCount = await this.repository.count();
      if (projectCount >= this.options.maxProjects) {
        throw new Error(`Maximum number of projects (${this.options.maxProjects}) reached`);
      }
    }

    // Create and save new project entity
    const entity = ProjectEntity.fromProjectData(defaultProject);
    await this.repository.save(entity);
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

  async getProject(id: number): Promise<ProjectMetadata | null> {
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
    project: Omit<ProjectMetadata, 'id' | 'createdAt' | 'lastAccessedAt'>,
  ): Promise<ProjectMetadata> {
    this.ensureInitialized();

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

  async updateProject(id: number, updates: Partial<ProjectMetadata>): Promise<ProjectMetadata> {
    this.ensureInitialized();

    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      throw new Error(`Project with ID '${id}' not found`);
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

  async deleteProject(id: number): Promise<void> {
    this.ensureInitialized();

    const result = await this.repository.delete({ id });
    if (result.affected === 0) {
      throw new Error(`Project with ID '${id}' not found`);
    }

    // If this was the current project, reset to null
    if (this.currentProjectId === id) {
      this.currentProjectId = null;
    }
  }

  async getDefaultProject(): Promise<number> {
    this.ensureInitialized();
    // Get the first project (lowest ID) as the default
    const defaultProject = await this.repository.findOne({
      order: { id: 'ASC' },
    });

    if (!defaultProject) {
      throw new Error('No projects found');
    }

    return defaultProject.id;
  }

  async setDefaultProject(id: number): Promise<void> {
    this.ensureInitialized();

    // Verify project exists
    const project = await this.repository.findOne({ where: { id } });
    if (!project) {
      throw new Error(`Project with ID '${id}' not found`);
    }

    // For now, we'll consider the first project (lowest ID) as default
    // In the future, this could be stored in a settings table
    // This is a no-op for now since we determine default by ID ordering
  }

  async switchToProject(id: number): Promise<ProjectContext> {
    this.ensureInitialized();

    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      throw new Error(`Project with ID '${id}' not found`);
    }

    // Update last accessed time
    entity.lastAccessedAt = new Date();
    await this.repository.save(entity);

    // Set as current project
    this.currentProjectId = id;

    const project = entity.toProjectMetadata();
    const defaultProjectId = await this.getDefaultProject();
    return {
      projectId: id,
      project,
      isDefault: id === defaultProjectId,
    };
  }

  async getCurrentProject(): Promise<ProjectContext | null> {
    this.ensureInitialized();

    let projectId = this.currentProjectId;

    // Fall back to default project if no current project set
    if (!projectId) {
      try {
        projectId = await this.getDefaultProject();
      } catch {
        return null; // No projects exist
      }
    }

    const entity = await this.repository.findOne({ where: { id: projectId } });
    if (!entity) {
      return null;
    }

    const project = entity.toProjectMetadata();
    const defaultProjectId = await this.getDefaultProject();
    return {
      projectId,
      project,
      isDefault: projectId === defaultProjectId,
    };
  }
}
