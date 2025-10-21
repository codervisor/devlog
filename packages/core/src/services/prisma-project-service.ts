/**
 * Prisma-based Project Service
 * 
 * **SUPPORTING SERVICE - Project management functionality**
 *
 * Manages project metadata and organization. Projects provide context for
 * agent sessions and optional work items, enabling multi-project isolation
 * and organization of observability data.
 * 
 * **Key Responsibilities:**
 * - Project CRUD: Create, read, update, delete projects
 * - Project isolation: Separate data for different codebases/teams
 * - Context management: Track project-level settings and metadata
 * 
 * **Relationship to Agent Observability:**
 * Projects are containers for agent sessions. Each session belongs to a project,
 * enabling teams to organize observability data by codebase or product.
 * 
 * Migrated from TypeORM to Prisma for better Next.js integration.
 * Manages projects using Prisma Client with improved type safety.
 * 
 * @module services/prisma-project-service
 * @category Project Management
 */

import type { Project } from '../types/project.js';
import { ProjectValidator } from '../validation/project-schemas.js';
import { PrismaServiceBase } from './prisma-service-base.js';

interface ProjectServiceInstance {
  service: PrismaProjectService;
  createdAt: number;
}

export class PrismaProjectService extends PrismaServiceBase {
  private static instances: Map<string, ProjectServiceInstance> = new Map();

  private constructor() {
    super();
  }

  static getInstance(): PrismaProjectService {
    const key = 'default';
    
    return this.getOrCreateInstance(this.instances, key, () => new PrismaProjectService());
  }

  /**
   * Hook called when Prisma client is successfully connected
   */
  protected async onPrismaConnected(): Promise<void> {
    console.log('[PrismaProjectService] Service initialized with database connection');
  }

  /**
   * Hook called when service is running in fallback mode
   */
  protected async onFallbackMode(): Promise<void> {
    console.log('[PrismaProjectService] Service initialized in fallback mode');
  }

  /**
   * Hook called during disposal for cleanup
   */
  protected async onDispose(): Promise<void> {
    // Remove from instances map
    for (const [key, instance] of PrismaProjectService.instances.entries()) {
      if (instance.service === this) {
        PrismaProjectService.instances.delete(key);
        break;
      }
    }
  }

  /**
   * List all projects ordered by last accessed time
   */
  async list(): Promise<Project[]> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      // Return empty list when Prisma client is not available
      console.warn('[PrismaProjectService] list() called in fallback mode - returning empty array');
      return [];
    }

    const projects = await this.prismaClient!.project.findMany({
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
    await this.ensureInitialized();
    
    if (this.isFallbackMode) {
      console.warn('[PrismaProjectService] get() called in fallback mode - returning null');
      return null;
    }

    const project = await this.prismaClient!.project.findUnique({
      where: { id },
    });

    if (!project) {
      return null;
    }

    // Update last accessed time
    await this.prismaClient!.project.update({
      where: { id },
      data: { lastAccessedAt: new Date() },
    });

    return this.entityToProject(project);
  }

  /**
   * Get project by name (case-insensitive)
   */
  async getByName(name: string): Promise<Project | null> {
    await this.ensureInitialized();
    
    if (this.isFallbackMode) {
      console.warn('[PrismaProjectService] getByName() called in fallback mode - returning null');
      return null;
    }

    // Prisma doesn't have case-insensitive search by default for all databases
    // Using mode: 'insensitive' for PostgreSQL, fallback to exact match for others
    let project;
    try {
      project = await this.prismaClient!.project.findFirst({
        where: {
          name: {
            equals: name,
            mode: 'insensitive', // Works with PostgreSQL
          },
        },
      });
    } catch (error) {
      // Fallback for databases that don't support case-insensitive mode
      project = await this.prismaClient!.project.findFirst({
        where: { name },
      });
    }

    if (!project) {
      return null;
    }

    // Update last accessed time
    await this.prismaClient!.project.update({
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
    await this.ensureInitialized();

    // Validate input
    const validation = ProjectValidator.validateCreateRequest(projectData);
    if (!validation.success) {
      throw new Error(`Invalid project data: ${validation.errors.join(', ')}`);
    }

    if (this.isFallbackMode) {
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

    const project = await this.prismaClient!.project.create({
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
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      console.warn('[PrismaProjectService] update() called in fallback mode - returning mock project');
      return {
        id,
        name: updates.name || 'Mock Project',
        description: updates.description || 'Mock Description',
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      };
    }

    const existingProject = await this.prismaClient!.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      throw new Error(`Project with ID ${id} not found`);
    }

    // Validate updates
    if (updates.name !== undefined || updates.description !== undefined) {
      const validation = ProjectValidator.validateCreateRequest({
        name: updates.name ?? existingProject.name,
        description: updates.description ?? existingProject.description,
      });
      if (!validation.success) {
        throw new Error(`Invalid project data: ${validation.errors.join(', ')}`);
      }
    }

    const updateData: any = {
      lastAccessedAt: new Date(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;

    const project = await this.prismaClient!.project.update({
      where: { id },
      data: updateData,
    });

    return this.entityToProject(project);
  }

  /**
   * Delete a project and all associated data
   */
  async delete(id: number): Promise<void> {
    await this.ensureInitialized();

    if (this.isFallbackMode) {
      console.warn('[PrismaProjectService] delete() called in fallback mode - operation ignored');
      return;
    }

    const existingProject = await this.prismaClient!.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      throw new Error(`Project with ID ${id} not found`);
    }

    // Prisma handles cascading deletes automatically based on schema relationships
    await this.prismaClient!.project.delete({
      where: { id },
    });
  }

  /**
   * Dispose of resources
   */
  async dispose(): Promise<void> {
    await super.dispose();
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