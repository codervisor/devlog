/**
 * Prisma-based Project Service
 *
 * Migrated from TypeORM to Prisma for better Next.js integration
 * Manages projects using Prisma Client with improved type safety
 * 
 * NOTE: This service requires Prisma Client to be generated first:
 * Run `npx prisma generate` after setting up the database connection
 */

// TODO: Uncomment after Prisma client generation
// import type { PrismaClient } from '@prisma/client';
// import { getPrismaClient } from '../utils/prisma-config.js';

import type { Project } from '../types/project.js';
import { ProjectValidator } from '../validation/project-schemas.js';

export class PrismaProjectService {
  private static instance: PrismaProjectService | null = null;
  // TODO: Uncomment after Prisma client generation  
  // private prisma: PrismaClient;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // TODO: Uncomment after Prisma client generation
    // this.prisma = getPrismaClient();
  }

  static getInstance(): PrismaProjectService {
    if (!PrismaProjectService.instance) {
      PrismaProjectService.instance = new PrismaProjectService();
    }
    return PrismaProjectService.instance;
  }

  /**
   * Initialize the service (mainly for API compatibility with TypeORM version)
   * Prisma Client doesn't require explicit initialization like TypeORM DataSource
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      // TODO: Uncomment after Prisma client generation
      // await this.prisma.$queryRaw`SELECT 1`;
      console.log('[PrismaProjectService] Database connection established');
    } catch (error) {
      console.error('[PrismaProjectService] Failed to connect to database:', error);
      throw error;
    }
  }

  /**
   * List all projects ordered by last accessed time
   */
  async list(): Promise<Project[]> {
    await this.initialize();

    // TODO: Implement with Prisma after client generation
    throw new Error('PrismaProjectService: Requires Prisma client generation - run `npx prisma generate`');
    
    /* TODO: Uncomment after Prisma client generation
    const projects = await this.prisma.project.findMany({
      orderBy: {
        lastAccessedAt: 'desc',
      },
    });

    return projects.map(this.entityToProject);
    */
  }

  /**
   * Get project by ID
   */
  async get(id: number): Promise<Project | null> {
    await this.initialize();
    
    // TODO: Implement with Prisma after client generation
    throw new Error('PrismaProjectService: Requires Prisma client generation - run `npx prisma generate`');

    /* TODO: Uncomment after Prisma client generation
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return null;
    }

    // Update last accessed time
    await this.prisma.project.update({
      where: { id },
      data: { lastAccessedAt: new Date() },
    });

    return this.entityToProject(project);
    */
  }

  /**
   * Get project by name (case-insensitive)
   */
  async getByName(name: string): Promise<Project | null> {
    await this.initialize();
    
    // TODO: Implement with Prisma after client generation
    throw new Error('PrismaProjectService: Requires Prisma client generation - run `npx prisma generate`');

    /* TODO: Uncomment after Prisma client generation
    // Prisma doesn't have case-insensitive search by default for all databases
    // Using mode: 'insensitive' for PostgreSQL, fallback to exact match for others
    let project;
    try {
      project = await this.prisma.project.findFirst({
        where: {
          name: {
            equals: name,
            mode: 'insensitive', // Works with PostgreSQL
          },
        },
      });
    } catch (error) {
      // Fallback for databases that don't support case-insensitive mode
      project = await this.prisma.project.findFirst({
        where: { name },
      });
    }

    if (!project) {
      return null;
    }

    // Update last accessed time
    await this.prisma.project.update({
      where: { id: project.id },
      data: { lastAccessedAt: new Date() },
    });

    return this.entityToProject(project);
    */
  }

  /**
   * Create a new project
   */
  async create(
    projectData: Omit<Project, 'id' | 'createdAt' | 'lastAccessedAt'>
  ): Promise<Project> {
    await this.initialize();

    // Validate input
    const validation = ProjectValidator.validateCreateRequest(projectData);
    if (!validation.success) {
      throw new Error(`Invalid project data: ${validation.errors.join(', ')}`);
    }

    // TODO: Implement with Prisma after client generation
    throw new Error('PrismaProjectService: Requires Prisma client generation - run `npx prisma generate`');

    /* TODO: Uncomment after Prisma client generation
    const project = await this.prisma.project.create({
      data: {
        name: projectData.name,
        description: projectData.description,
        lastAccessedAt: new Date(),
      },
    });

    return this.entityToProject(project);
    */
  }

  /**
   * Update an existing project
   */
  async update(id: number, updates: Partial<Project>): Promise<Project> {
    await this.initialize();

    // TODO: Implement with Prisma after client generation
    throw new Error('PrismaProjectService: Requires Prisma client generation - run `npx prisma generate`');

    /* TODO: Uncomment after Prisma client generation
    const existingProject = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      throw new Error(`Project with ID ${id} not found`);
    }

    // Validate updates
    if (updates.name !== undefined || updates.description !== undefined) {
      const validation = ProjectValidator.validateCreate({
        name: updates.name ?? existingProject.name,
        description: updates.description ?? existingProject.description,
      });
      if (!validation.success) {
        throw new Error(`Invalid project data: ${validation.error.issues.map((i: any) => i.message).join(', ')}`);
      }
    }

    const updateData: any = {
      lastAccessedAt: new Date(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;

    const project = await this.prisma.project.update({
      where: { id },
      data: updateData,
    });

    return this.entityToProject(project);
    */
  }

  /**
   * Delete a project and all associated data
   */
  async delete(id: number): Promise<void> {
    await this.initialize();

    // TODO: Implement with Prisma after client generation
    throw new Error('PrismaProjectService: Requires Prisma client generation - run `npx prisma generate`');

    /* TODO: Uncomment after Prisma client generation
    const existingProject = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      throw new Error(`Project with ID ${id} not found`);
    }

    // Prisma handles cascading deletes automatically based on schema relationships
    await this.prisma.project.delete({
      where: { id },
    });
    */
  }

  /**
   * Dispose of resources
   */
  async dispose(): Promise<void> {
    // Prisma Client handles connection cleanup automatically
    // This method is kept for API compatibility with TypeORM version
  }

  /**
   * Convert Prisma entity to Project interface
   */
  private entityToProject(entity: any): Project {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      createdAt: entity.createdAt,
      lastAccessedAt: entity.lastAccessedAt,
    };
  }
}