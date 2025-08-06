/**
 * Database-backed Project Manager
 *
 * Manages projects using database storage without per-project storage configuration.
 * Uses the centralized application storage configuration.
 */

import { DataSource, Repository } from 'typeorm';
import type { Project } from '../types/project.js';
import { ProjectEntity } from '../entities/project.entity.js';
import { getDataSource } from '../utils/typeorm-config.js';
import { ProjectValidator } from '../validation/project-schemas.js';

export class ProjectService {
  private static instance: ProjectService | null = null;
  private database: DataSource;
  private repository: Repository<ProjectEntity>;

  constructor() {
    // Database initialization will happen in ensureInitialized()
    this.database = null as any; // Temporary placeholder
    this.repository = null as any; // Temporary placeholder
  }

  static getInstance(): ProjectService {
    if (!ProjectService.instance) {
      ProjectService.instance = new ProjectService();
    }
    return ProjectService.instance;
  }

  /**
   * Initialize the database connection if not already initialized
   */
  private async ensureInitialized(): Promise<void> {
    try {
      if (!this.database || !this.database.isInitialized) {
        console.log('[ProjectService] Getting initialized DataSource...');
        this.database = await getDataSource();
        this.repository = this.database.getRepository(ProjectEntity);
        console.log(
          '[ProjectService] DataSource ready with entities:',
          this.database.entityMetadatas.length,
        );
        console.log('[ProjectService] Repository initialized:', !!this.repository);
      }
    } catch (error) {
      console.error('[ProjectService] Failed to initialize:', error);
      throw error;
    }
  }

  async list(): Promise<Project[]> {
    await this.ensureInitialized(); // Ensure initialization

    const entities = await this.repository.find({
      order: { lastAccessedAt: 'DESC' },
    });
    return entities.map((entity) => entity.toProjectMetadata());
  }

  async get(id: number): Promise<Project | null> {
    await this.ensureInitialized(); // Ensure initialization

    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      return null;
    }

    // Update last accessed time
    entity.lastAccessedAt = new Date();
    await this.repository.save(entity);

    return entity.toProjectMetadata();
  }

  async create(project: Omit<Project, 'id' | 'createdAt' | 'lastAccessedAt'>): Promise<Project> {
    await this.ensureInitialized(); // Ensure initialization

    // Validate input data
    const validation = ProjectValidator.validateCreateRequest(project);
    if (!validation.success) {
      throw new Error(`Invalid project data: ${validation.errors.join(', ')}`);
    }

    const validatedProject = validation.data;

    // Check for duplicate project name
    const uniqueCheck = await ProjectValidator.validateUniqueProjectName(
      validatedProject.name,
      undefined,
      async (name) => {
        const existing = await this.repository.findOne({ where: { name } });
        return !!existing;
      },
    );

    if (!uniqueCheck.success) {
      throw new Error(uniqueCheck.error!);
    }

    // Create and save new project entity
    const entity = ProjectEntity.fromProjectData(validatedProject);
    const savedEntity = await this.repository.save(entity);

    return savedEntity.toProjectMetadata();
  }

  async update(id: number, updates: Partial<Project>): Promise<Project> {
    await this.ensureInitialized(); // Ensure initialization

    // Validate project ID
    const idValidation = ProjectValidator.validateProjectId(id);
    if (!idValidation.success) {
      throw new Error(`Invalid project ID: ${idValidation.errors.join(', ')}`);
    }

    // Validate update data
    const validation = ProjectValidator.validateUpdateRequest(updates);
    if (!validation.success) {
      throw new Error(`Invalid update data: ${validation.errors.join(', ')}`);
    }

    const validatedUpdates = validation.data;

    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      throw new Error(`Project with ID '${id}' not found`);
    }

    // Check for duplicate project name if name is being updated
    if (validatedUpdates.name && validatedUpdates.name !== entity.name) {
      const uniqueCheck = await ProjectValidator.validateUniqueProjectName(
        validatedUpdates.name,
        id,
        async (name, excludeId) => {
          const existing = await this.repository.findOne({
            where: { name },
          });
          return !!existing && existing.id !== excludeId;
        },
      );

      if (!uniqueCheck.success) {
        throw new Error(uniqueCheck.error!);
      }
    }

    // Update entity
    entity.updateFromProjectData(validatedUpdates);
    const savedEntity = await this.repository.save(entity);

    return savedEntity.toProjectMetadata();
  }

  async delete(id: number): Promise<void> {
    await this.ensureInitialized(); // Ensure initialization

    // Validate project ID
    const idValidation = ProjectValidator.validateProjectId(id);
    if (!idValidation.success) {
      throw new Error(`Invalid project ID: ${idValidation.errors.join(', ')}`);
    }

    const result = await this.repository.delete({ id });
    if (result.affected === 0) {
      throw new Error(`Project with ID '${id}' not found`);
    }
  }
}
