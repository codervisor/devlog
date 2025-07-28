/**
 * Database-backed Project Manager
 *
 * Manages projects using database storage without per-project storage configuration.
 * Uses the centralized application storage configuration.
 */

import { DataSource, Repository } from 'typeorm';
import type { ProjectMetadata } from '../types/project.js';
import { ProjectEntity } from '../entities/project.entity.js';
import { createDataSource } from '../utils/typeorm-config.js';

export class ProjectService {
  private static instance: ProjectService | null = null;
  private database: DataSource;
  private repository: Repository<ProjectEntity>;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.database = createDataSource();
    this.repository = this.database.getRepository(ProjectEntity);
  }

  static getInstance(): ProjectService {
    if (!ProjectService.instance) {
      ProjectService.instance = new ProjectService();
    }
    return ProjectService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise; // Return existing initialization promise
    }

    // Create default project if it doesn't exist
    this.initPromise = this.createDefaultProject();

    return this.initPromise;
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
    };

    // Create project directly without initialization check since this is called during initialization
    const existing = await this.repository.findOne({ where: { name: defaultProject.name } });
    if (existing) {
      return; // Default project already exists
    }

    // Create and save new project entity
    const entity = ProjectEntity.fromProjectData(defaultProject);
    await this.repository.save(entity);
  }

  async list(): Promise<ProjectMetadata[]> {
    const entities = await this.repository.find({
      order: { lastAccessedAt: 'DESC' },
    });
    return entities.map((entity) => entity.toProjectMetadata());
  }

  async get(id: number): Promise<ProjectMetadata | null> {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      return null;
    }

    // Update last accessed time
    entity.lastAccessedAt = new Date();
    await this.repository.save(entity);

    return entity.toProjectMetadata();
  }

  async create(
    project: Omit<ProjectMetadata, 'id' | 'createdAt' | 'lastAccessedAt'>,
  ): Promise<ProjectMetadata> {
    // Create and save new project entity
    const entity = ProjectEntity.fromProjectData(project);
    const savedEntity = await this.repository.save(entity);

    return savedEntity.toProjectMetadata();
  }

  async update(id: number, updates: Partial<ProjectMetadata>): Promise<ProjectMetadata> {
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

  async delete(id: number): Promise<void> {
    const result = await this.repository.delete({ id });
    if (result.affected === 0) {
      throw new Error(`Project with ID '${id}' not found`);
    }
  }
}
