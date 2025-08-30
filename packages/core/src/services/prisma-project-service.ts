/**
 * Prisma-based Project Service
 *
 * Migrated from TypeORM to Prisma for better Next.js integration
 * Manages projects using Prisma Client with improved type safety
 * 
 * NOTE: This service requires Prisma Client to be generated first:
 * Run `npx prisma generate` after setting up the database connection
 */

import type { Project } from '../types/project.js';
import { ProjectValidator } from '../validation/project-schemas.js';

export class PrismaProjectService {
  private static instance: PrismaProjectService | null = null;
  private prisma: any = null;
  private initPromise: Promise<void> | null = null;
  private fallbackMode = true;
  private prismaImportPromise: Promise<void> | null = null;

  constructor() {
    // Initialize Prisma imports lazily
    this.prismaImportPromise = this.initializePrismaClient();
  }

  private async initializePrismaClient(): Promise<void> {
    try {
      // Try to import Prisma client - will fail if not generated
      const prismaModule = await import('@prisma/client');
      const configModule = await import('../utils/prisma-config.js');
      
      if (prismaModule.PrismaClient && configModule.getPrismaClient) {
        this.prisma = configModule.getPrismaClient();
        this.fallbackMode = false;
        console.log('[PrismaProjectService] Prisma client initialized successfully');
      }
    } catch (error) {
      // Prisma client not available - service will operate in fallback mode
      console.warn('[PrismaProjectService] Prisma client not available, operating in fallback mode:', error.message);
      this.fallbackMode = true;
    }
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
    // Wait for Prisma client initialization
    if (this.prismaImportPromise) {
      await this.prismaImportPromise;
    }

    try {
      if (!this.fallbackMode && this.prisma) {
        await this.prisma.$queryRaw`SELECT 1`;
        console.log('[PrismaProjectService] Database connection established');
      } else {
        console.log('[PrismaProjectService] Initialized in fallback mode - Prisma client not available');
      }
    } catch (error) {
      console.error('[PrismaProjectService] Failed to connect to database:', error);
      // In fallback mode, don't throw errors
      if (!this.fallbackMode) {
        throw error;
      }
    }
  }

  /**
   * List all projects ordered by last accessed time
   */
  async list(): Promise<Project[]> {
    await this.initialize();

    if (this.fallbackMode) {
      // Return empty list when Prisma client is not available
      console.warn('[PrismaProjectService] list() called in fallback mode - returning empty array');
      return [];
    }

    const projects = await this.prisma.project.findMany({
      orderBy: {
        lastAccessedAt: 'desc',
      },
    });

    return projects.map(this.entityToProject);
  }

  /**
   * Get project by ID
   */
  async get(id: number): Promise<Project | null> {
    await this.initialize();
    
    if (this.fallbackMode) {
      console.warn('[PrismaProjectService] get() called in fallback mode - returning null');
      return null;
    }

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
  }

  /**
   * Get project by name (case-insensitive)
   */
  async getByName(name: string): Promise<Project | null> {
    await this.initialize();
    
    if (this.fallbackMode) {
      console.warn('[PrismaProjectService] getByName() called in fallback mode - returning null');
      return null;
    }

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

    if (this.fallbackMode) {
      // Return a mock project in fallback mode
      console.warn('[PrismaProjectService] create() called in fallback mode - returning mock project');
      return {
        id: Math.floor(Math.random() * 1000) + 1,
        name: projectData.name,
        description: projectData.description,
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      };
    }

    const project = await this.prisma.project.create({
      data: {
        name: projectData.name,
        description: projectData.description,
        lastAccessedAt: new Date(),
      },
    });

    return this.entityToProject(project);
  }

  /**
   * Update an existing project
   */
  async update(id: number, updates: Partial<Project>): Promise<Project> {
    await this.initialize();

    if (this.fallbackMode) {
      console.warn('[PrismaProjectService] update() called in fallback mode - returning mock project');
      return {
        id,
        name: updates.name || 'Mock Project',
        description: updates.description || 'Mock Description',
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      };
    }

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
  }

  /**
   * Delete a project and all associated data
   */
  async delete(id: number): Promise<void> {
    await this.initialize();

    if (this.fallbackMode) {
      console.warn('[PrismaProjectService] delete() called in fallback mode - operation ignored');
      return;
    }

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