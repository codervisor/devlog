/**
 * Prisma-based DevlogService
 *
 * Migrated from TypeORM to Prisma for better Next.js integration
 * Manages devlog entries using Prisma Client with improved type safety
 * 
 * This service provides comprehensive devlog management functionality:
 * - CRUD operations for devlog entries
 * - Advanced search and filtering
 * - Statistics and analytics
 * - Notes and document management
 * 
 * NOTE: This service requires Prisma Client to be generated first:
 * Run `npx prisma generate` after setting up the database connection
 */

import type {
  DevlogEntry,
  DevlogFilter,
  DevlogId,
  DevlogStats,
  PaginatedResult,
  PaginationMeta,
  SearchMeta,
  SearchOptions,
  SearchPaginatedResult,
  SearchResult,
  SortOptions,
  TimeSeriesDataPoint,
  TimeSeriesRequest,
  TimeSeriesStats,
} from '../types/index.js';
import { DevlogValidator } from '../validation/devlog-schemas.js';
import { generateDevlogKey } from '../utils/key-generator.js';

interface DevlogServiceInstance {
  service: PrismaDevlogService;
  createdAt: number;
}

export class PrismaDevlogService {
  private static instances: Map<number, DevlogServiceInstance> = new Map();
  private static readonly TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
  
  private prisma: any = null;
  private initPromise: Promise<void> | null = null;
  private fallbackMode = true;
  private prismaImportPromise: Promise<void> | null = null;
  private pgTrgmAvailable: boolean = false;

  private constructor(private projectId?: number) {
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
        console.log('[PrismaDevlogService] Prisma client initialized successfully');
      }
    } catch (error) {
      // Prisma client not available - service will operate in fallback mode
      console.warn('[PrismaDevlogService] Prisma client not available, operating in fallback mode:', error.message);
      this.fallbackMode = true;
    }
  }

  /**
   * Get or create a DevlogService instance for a specific project
   * Implements singleton pattern with TTL-based cleanup
   */
  static getInstance(projectId?: number): PrismaDevlogService {
    const id = projectId || 0;
    const now = Date.now();
    
    // Clean up expired instances
    for (const [key, instance] of this.instances.entries()) {
      if (now - instance.createdAt > this.TTL_MS) {
        this.instances.delete(key);
      }
    }

    let instance = this.instances.get(id);
    if (!instance) {
      instance = {
        service: new PrismaDevlogService(projectId),
        createdAt: now,
      };
      this.instances.set(id, instance);
    }

    return instance.service;
  }

  /**
   * Initialize the service
   * Unlike TypeORM, Prisma doesn't require explicit database initialization
   */
  async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  /**
   * Internal initialization method
   */
  private async _initialize(): Promise<void> {
    // Wait for Prisma client initialization
    if (this.prismaImportPromise) {
      await this.prismaImportPromise;
    }

    try {
      if (!this.fallbackMode && this.prisma) {
        // Check database connectivity
        await this.prisma.$connect();
        
        // Check for PostgreSQL extensions (similar to TypeORM version)
        await this.ensurePgTrgmExtension();
        
        console.log('[PrismaDevlogService] Service initialized for project:', this.projectId);
      } else {
        console.log('[PrismaDevlogService] Service initialized in fallback mode for project:', this.projectId);
      }
    } catch (error) {
      console.error('[PrismaDevlogService] Failed to initialize:', error);
      this.initPromise = null;
      if (!this.fallbackMode) {
        throw error;
      }
    }
  }

  /**
   * Check and ensure pg_trgm extension is available for PostgreSQL text search
   */
  private async ensurePgTrgmExtension(): Promise<void> {
    try {
      // TODO: Uncomment after Prisma client generation
      // Check if we're using PostgreSQL
      // const dbUrl = process.env.DATABASE_URL;
      // if (!dbUrl?.includes('postgresql')) {
      //   this.pgTrgmAvailable = false;
      //   return;
      // }

      // Check for pg_trgm extension
      // const result = await this.prisma.$queryRaw<Array<{ installed: boolean }>>`
      //   SELECT EXISTS(
      //     SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'
      //   ) as installed;
      // `;
      
      // this.pgTrgmAvailable = result[0]?.installed || false;
      
      // Try to create extension if not available (requires superuser)
      // if (!this.pgTrgmAvailable) {
      //   try {
      //     await this.prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_trgm;`;
      //     this.pgTrgmAvailable = true;
      //   } catch (error) {
      //     console.warn('[PrismaDevlogService] pg_trgm extension not available:', error);
      //   }
      // }
      
      // For now, assume extension is available (will be implemented after client generation)
      this.pgTrgmAvailable = true;
    } catch (error) {
      console.warn('[PrismaDevlogService] Could not check pg_trgm extension:', error);
      this.pgTrgmAvailable = false;
    }
  }

  /**
   * Create a new devlog entry
   */
  async create(entry: Omit<DevlogEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<DevlogEntry> {
    await this.ensureInitialized();
    
    // Validate input
    const validatedEntry = DevlogValidator.validateDevlogEntry({
      ...entry,
      id: 0, // Placeholder, will be auto-generated
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (!validatedEntry.success) {
      throw new Error(`Invalid devlog entry: ${validatedEntry.errors.join(', ')}`);
    }

    try {
      // Generate unique key if not provided
      const key = entry.key || generateDevlogKey(entry.title, entry.type, entry.description);
      
      // TODO: Uncomment after Prisma client generation
      // const created = await this.prisma.devlogEntry.create({
      //   data: {
      //     key,
      //     title: validatedEntry.data.title,
      //     type: validatedEntry.data.type,
      //     description: validatedEntry.data.description,
      //     status: validatedEntry.data.status,
      //     priority: validatedEntry.data.priority,
      //     assignee: validatedEntry.data.assignee,
      //     projectId: validatedEntry.data.projectId || this.projectId!,
      //     businessContext: validatedEntry.data.businessContext,
      //     technicalContext: validatedEntry.data.technicalContext,
      //     tags: entry.context?.tags ? JSON.stringify(entry.context.tags) : null,
      //     files: entry.context?.files ? JSON.stringify(entry.context.files) : null,
      //     dependencies: entry.context?.dependencies ? JSON.stringify(entry.context.dependencies) : null,
      //   },
      //   include: {
      //     notes: true,
      //     documents: true,
      //   },
      // });

      // return this.mapPrismaToDevlogEntry(created);
      
      // Temporary mock return for development
      return {
        ...validatedEntry.data,
        id: Math.floor(Math.random() * 10000), // Mock ID
        key,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[PrismaDevlogService] Failed to create devlog entry:', error);
      throw new Error(`Failed to create devlog entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a devlog entry by ID
   */
  async get(id: DevlogId): Promise<DevlogEntry | null> {
    await this.ensureInitialized();

    try {
      // TODO: Uncomment after Prisma client generation
      // const entry = await this.prisma.devlogEntry.findUnique({
      //   where: { id: Number(id) },
      //   include: {
      //     notes: true,
      //     documents: true,
      //     project: true,
      //   },
      // });

      // return entry ? this.mapPrismaToDevlogEntry(entry) : null;
      
      // Temporary mock return for development
      return null;
    } catch (error) {
      console.error('[PrismaDevlogService] Failed to get devlog entry:', error);
      throw new Error(`Failed to get devlog entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a devlog entry by key
   */
  async getByKey(key: string): Promise<DevlogEntry | null> {
    await this.ensureInitialized();

    try {
      // TODO: Uncomment after Prisma client generation
      // const entry = await this.prisma.devlogEntry.findUnique({
      //   where: { key },
      //   include: {
      //     notes: true,
      //     documents: true,
      //     project: true,
      //   },
      // });

      // return entry ? this.mapPrismaToDevlogEntry(entry) : null;
      
      // Temporary mock return for development
      return null;
    } catch (error) {
      console.error('[PrismaDevlogService] Failed to get devlog entry by key:', error);
      throw new Error(`Failed to get devlog entry by key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a devlog entry
   */
  async update(id: DevlogId, updates: Partial<DevlogEntry>): Promise<DevlogEntry> {
    await this.ensureInitialized();

    try {
      // TODO: Uncomment after Prisma client generation
      // Prepare update data
      // const updateData: any = {
      //   updatedAt: new Date(),
      // };

      // Map fields to Prisma schema
      // if (updates.title !== undefined) updateData.title = updates.title;
      // if (updates.type !== undefined) updateData.type = updates.type;
      // if (updates.description !== undefined) updateData.description = updates.description;
      // if (updates.status !== undefined) updateData.status = updates.status;
      // if (updates.priority !== undefined) updateData.priority = updates.priority;
      // if (updates.assignee !== undefined) updateData.assignee = updates.assignee;
      // if (updates.closedAt !== undefined) updateData.closedAt = updates.closedAt;
      // if (updates.archived !== undefined) updateData.archived = updates.archived;

      // Handle context updates
      // if (updates.context) {
      //   if (updates.context.business !== undefined) updateData.businessContext = updates.context.business;
      //   if (updates.context.technical !== undefined) updateData.technicalContext = updates.context.technical;
      //   if (updates.context.tags !== undefined) updateData.tags = JSON.stringify(updates.context.tags);
      //   if (updates.context.files !== undefined) updateData.files = JSON.stringify(updates.context.files);
      //   if (updates.context.dependencies !== undefined) updateData.dependencies = JSON.stringify(updates.context.dependencies);
      // }

      // const updated = await this.prisma.devlogEntry.update({
      //   where: { id: Number(id) },
      //   data: updateData,
      //   include: {
      //     notes: true,
      //     documents: true,
      //     project: true,
      //   },
      // });

      // return this.mapPrismaToDevlogEntry(updated);
      
      // Temporary mock return for development
      const existing = await this.get(id);
      if (!existing) {
        throw new Error('Devlog entry not found');
      }
      
      return {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[PrismaDevlogService] Failed to update devlog entry:', error);
      throw new Error(`Failed to update devlog entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a devlog entry
   */
  async delete(id: DevlogId): Promise<void> {
    await this.ensureInitialized();

    try {
      // TODO: Uncomment after Prisma client generation
      // await this.prisma.devlogEntry.delete({
      //   where: { id: Number(id) },
      // });
      
      // Temporary mock for development
      console.log('[PrismaDevlogService] Mock delete devlog entry:', id);
    } catch (error) {
      console.error('[PrismaDevlogService] Failed to delete devlog entry:', error);
      throw new Error(`Failed to delete devlog entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List devlog entries with filtering and pagination
   */
  async list(filter?: DevlogFilter, sort?: SortOptions, pagination?: { limit?: number; offset?: number }): Promise<PaginatedResult<DevlogEntry>> {
    await this.ensureInitialized();

    try {
      // TODO: Uncomment after Prisma client generation
      // Build where clause
      // const where: any = {};
      
      // Add project filter
      // if (this.projectId) {
      //   where.projectId = this.projectId;
      // }

      // Add filters
      // if (filter?.status) where.status = { in: filter.status };
      // if (filter?.type) where.type = { in: filter.type };
      // if (filter?.priority) where.priority = { in: filter.priority };
      // if (filter?.assignee) where.assignee = filter.assignee;
      // if (filter?.archived !== undefined) where.archived = filter.archived;
      
      // Date range filters
      // if (filter?.createdAfter) where.createdAt = { gte: filter.createdAfter };
      // if (filter?.createdBefore) {
      //   where.createdAt = { ...where.createdAt, lte: filter.createdBefore };
      // }

      // Build order by
      // const orderBy: any = {};
      // if (sort?.sortBy && sort?.sortOrder) {
      //   orderBy[sort.sortBy] = sort.sortOrder;
      // } else {
      //   orderBy.updatedAt = 'desc'; // Default sort
      // }

      // Execute queries
      // const [entries, total] = await Promise.all([
      //   this.prisma.devlogEntry.findMany({
      //     where,
      //     orderBy,
      //     take: pagination?.limit || 20,
      //     skip: pagination?.offset || 0,
      //     include: {
      //       notes: true,
      //       documents: true,
      //       project: true,
      //     },
      //   }),
      //   this.prisma.devlogEntry.count({ where }),
      // ]);

      // const mappedEntries = entries.map(entry => this.mapPrismaToDevlogEntry(entry));
      
      // return {
      //   items: mappedEntries,
      //   pagination: {
      //     page: Math.floor((pagination?.offset || 0) / (pagination?.limit || 20)) + 1,
      //     limit: pagination?.limit || 20,
      //     total,
      //     totalPages: Math.ceil(total / (pagination?.limit || 20)),
      //   },
      // };
      
      // Temporary mock return for development
      return {
        items: [],
        pagination: {
          page: Math.floor((pagination?.offset || 0) / (pagination?.limit || 20)) + 1,
          limit: pagination?.limit || 20,
          total: 0,
          totalPages: 0,
        },
      };
    } catch (error) {
      console.error('[PrismaDevlogService] Failed to list devlog entries:', error);
      throw new Error(`Failed to list devlog entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search devlog entries with advanced text search
   */
  async search(
    query: string,
    filter?: DevlogFilter,
    pagination?: PaginationMeta,
    sortOptions?: SortOptions,
  ): Promise<PaginatedResult<DevlogEntry>> {
    await this.ensureInitialized();

    try {
      // TODO: Uncomment after Prisma client generation
      // Build search conditions
      // const where: any = {};
      
      // Add project filter
      // if (this.projectId) {
      //   where.projectId = this.projectId;
      // }

      // Add basic filters first
      // if (filter?.status) where.status = { in: filter.status };
      // if (filter?.type) where.type = { in: filter.type };
      // if (filter?.priority) where.priority = { in: filter.priority };
      // if (filter?.assignee) where.assignee = filter.assignee;
      // if (filter?.archived !== undefined) where.archived = filter.archived;

      // Handle text search
      // if (query) {
      //   if (this.pgTrgmAvailable) {
      //     // Use PostgreSQL trigram similarity for better search
      //     where.OR = [
      //       { title: { contains: query, mode: 'insensitive' } },
      //       { description: { contains: query, mode: 'insensitive' } },
      //       { businessContext: { contains: query, mode: 'insensitive' } },
      //       { technicalContext: { contains: query, mode: 'insensitive' } },
      //     ];
      //   } else {
      //     // Fallback to simple text search
      //     where.OR = [
      //       { title: { contains: query, mode: 'insensitive' } },
      //       { description: { contains: query, mode: 'insensitive' } },
      //     ];
      //   }
      // }

      // Build order by with search relevance
      // const orderBy: any = [];
      // if (sortOptions?.sortBy && sortOptions?.sortOrder) {
      //   orderBy.push({ [sortOptions.sortBy]: sortOptions.sortOrder });
      // } else {
      //   orderBy.push({ updatedAt: 'desc' });
      // }

      // Execute search
      // const [entries, total] = await Promise.all([
      //   this.prisma.devlogEntry.findMany({
      //     where,
      //     orderBy,
      //     take: pagination?.limit || 20,
      //     skip: ((pagination?.page || 1) - 1) * (pagination?.limit || 20),
      //     include: {
      //       notes: true,
      //       documents: true,
      //       project: true,
      //     },
      //   }),
      //   this.prisma.devlogEntry.count({ where }),
      // ]);

      // const mappedEntries = entries.map(entry => this.mapPrismaToDevlogEntry(entry));
      
      // return {
      //   items: mappedEntries,
      //   pagination: {
      //     page: pagination?.page || 1,
      //     limit: pagination?.limit || 20,
      //     total,
      //     totalPages: Math.ceil(total / (pagination?.limit || 20)),
      //   },
      // };
      
      // Temporary mock return for development
      return {
        items: [],
        pagination: {
          page: pagination?.page || 1,
          limit: pagination?.limit || 20,
          total: 0,
          totalPages: 0,
        },
      };
    } catch (error) {
      console.error('[PrismaDevlogService] Failed to search devlog entries:', error);
      throw new Error(`Failed to search devlog entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get statistics for devlog entries
   */
  async getStats(filter?: DevlogFilter): Promise<DevlogStats> {
    await this.ensureInitialized();

    try {
      // TODO: Uncomment after Prisma client generation
      // Build where clause
      // const where: any = {};
      // if (this.projectId) where.projectId = this.projectId;
      // if (filter?.status) where.status = { in: filter.status };
      // if (filter?.type) where.type = { in: filter.type };
      // if (filter?.priority) where.priority = { in: filter.priority };
      // if (filter?.assignee) where.assignee = filter.assignee;
      // if (filter?.archived !== undefined) where.archived = filter.archived;

      // Get aggregated statistics
      // const [
      //   total,
      //   statusCounts,
      //   typeCounts,
      //   priorityCounts,
      //   assigneeCounts,
      // ] = await Promise.all([
      //   this.prisma.devlogEntry.count({ where }),
      //   this.prisma.devlogEntry.groupBy({
      //     by: ['status'],
      //     where,
      //     _count: { status: true },
      //   }),
      //   this.prisma.devlogEntry.groupBy({
      //     by: ['type'],
      //     where,
      //     _count: { type: true },
      //   }),
      //   this.prisma.devlogEntry.groupBy({
      //     by: ['priority'],
      //     where,
      //     _count: { priority: true },
      //   }),
      //   this.prisma.devlogEntry.groupBy({
      //     by: ['assignee'],
      //     where: { ...where, assignee: { not: null } },
      //     _count: { assignee: true },
      //   }),
      // ]);

      // return {
      //   total,
      //   byStatus: Object.fromEntries(statusCounts.map(s => [s.status, s._count.status])),
      //   byType: Object.fromEntries(typeCounts.map(t => [t.type, t._count.type])),
      //   byPriority: Object.fromEntries(priorityCounts.map(p => [p.priority, p._count.priority])),
      //   byAssignee: Object.fromEntries(assigneeCounts.map(a => [a.assignee!, a._count.assignee])),
      // };
      
      // Temporary mock return for development
      return {
        totalEntries: 0,
        openEntries: 0,
        closedEntries: 0,
        byStatus: {
          'new': 0,
          'in-progress': 0,
          'blocked': 0,
          'in-review': 0,
          'testing': 0,
          'done': 0,
          'cancelled': 0,
        },
        byType: {
          'feature': 0,
          'bugfix': 0,
          'task': 0,
          'refactor': 0,
          'docs': 0,
        },
        byPriority: {
          'low': 0,
          'medium': 0,
          'high': 0,
          'critical': 0,
        },
        averageCompletionTime: undefined,
      };
    } catch (error) {
      console.error('[PrismaDevlogService] Failed to get stats:', error);
      throw new Error(`Failed to get devlog stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get time series data for devlog entries
   */
  async getTimeSeries(request: TimeSeriesRequest): Promise<TimeSeriesStats> {
    await this.ensureInitialized();

    try {
      // TODO: Implement time series aggregation with Prisma
      // This will require complex date grouping queries
      
      // Temporary mock return for development
      return {
        dataPoints: [],
        dateRange: {
          from: request.from || new Date(Date.now() - (request.days || 30) * 24 * 60 * 60 * 1000).toISOString(),
          to: request.to || new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('[PrismaDevlogService] Failed to get time series:', error);
      throw new Error(`Failed to get time series: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a note to a devlog entry
   */
  async addNote(devlogId: DevlogId, note: { category: string; content: string }): Promise<void> {
    await this.ensureInitialized();

    try {
      // TODO: Uncomment after Prisma client generation
      // await this.prisma.devlogNote.create({
      //   data: {
      //     id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      //     devlogId: Number(devlogId),
      //     timestamp: new Date(),
      //     category: note.category as any,
      //     content: note.content,
      //   },
      // });
      
      // Temporary mock for development
      console.log('[PrismaDevlogService] Mock add note to devlog:', devlogId, note);
    } catch (error) {
      console.error('[PrismaDevlogService] Failed to add note:', error);
      throw new Error(`Failed to add note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Dispose of the service and clean up resources
   */
  async dispose(): Promise<void> {
    try {
      // TODO: Uncomment after Prisma client generation
      // await this.prisma.$disconnect();
      
      // Remove from instances
      if (this.projectId !== undefined) {
        PrismaDevlogService.instances.delete(this.projectId);
      }
    } catch (error) {
      console.error('[PrismaDevlogService] Error during disposal:', error);
    }
  }

  /**
   * Map Prisma entity to DevlogEntry type
   * TODO: Implement after Prisma client generation
   */
  // private mapPrismaToDevlogEntry(prismaEntry: any): DevlogEntry {
  //   return {
  //     id: prismaEntry.id,
  //     key: prismaEntry.key,
  //     title: prismaEntry.title,
  //     type: prismaEntry.type,
  //     description: prismaEntry.description,
  //     status: prismaEntry.status,
  //     priority: prismaEntry.priority,
  //     createdAt: prismaEntry.createdAt,
  //     updatedAt: prismaEntry.updatedAt,
  //     closedAt: prismaEntry.closedAt,
  //     archived: prismaEntry.archived,
  //     assignee: prismaEntry.assignee,
  //     projectId: prismaEntry.projectId,
  //     context: {
  //       business: prismaEntry.businessContext,
  //       technical: prismaEntry.technicalContext,
  //       tags: prismaEntry.tags ? JSON.parse(prismaEntry.tags) : [],
  //       files: prismaEntry.files ? JSON.parse(prismaEntry.files) : [],
  //       dependencies: prismaEntry.dependencies ? JSON.parse(prismaEntry.dependencies) : [],
  //     },
  //     notes: prismaEntry.notes?.map((note: any) => ({
  //       id: note.id,
  //       timestamp: note.timestamp,
  //       category: note.category,
  //       content: note.content,
  //     })) || [],
  //     documents: prismaEntry.documents?.map((doc: any) => ({
  //       id: doc.id,
  //       title: doc.title,
  //       content: doc.content,
  //       contentType: doc.contentType,
  //       createdAt: doc.createdAt,
  //       updatedAt: doc.updatedAt,
  //     })) || [],
  //   };
  // }
}