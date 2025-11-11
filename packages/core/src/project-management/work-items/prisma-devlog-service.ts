/**
 * Prisma-based DevlogService (Work Item Service)
 *
 * **SUPPORTING SERVICE - Optional work item tracking**
 *
 * Manages "work items" (also known as "devlog entries") for organizing and
 * tracking development work. This is an optional feature that complements
 * the primary agent observability functionality.
 *
 * **Work Items vs Devlog Entries:**
 * - Both terms refer to the same entity (backward compatible)
 * - "Work item" is the preferred terminology (industry standard)
 * - Types: features, bugs, tasks, refactors, docs
 *
 * **Key Responsibilities:**
 * - CRUD operations for work items
 * - Status workflow management
 * - Notes and document management
 * - Statistics and analytics
 * - Advanced search and filtering
 *
 * **Relationship to Agent Observability:**
 * Work items provide optional structure for organizing agent sessions.
 * Sessions can reference a workItemId to link AI work to planned tasks.
 *
 * Migrated from TypeORM to Prisma for better Next.js integration.
 * Manages devlog entries using Prisma Client with improved type safety.
 *
 * This service provides comprehensive devlog management functionality:
 * - CRUD operations for devlog entries
 * - Advanced search and filtering
 * - Statistics and analytics
 * - Notes and document management
 *
 * NOTE: This service requires Prisma Client to be generated first:
 * Run `npx prisma generate` after setting up the database connection
 *
 * @module services/prisma-devlog-service
 * @category Project Management
 * @see {@link WorkItem} type alias for new code
 * @see {@link DevlogEntry} legacy type (still supported)
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
  DevlogStatus,
  DevlogType,
  DevlogPriority,
} from '../../types/index.js';
import { DevlogValidator } from '../../validation/devlog-schemas.js';
import { generateDevlogKey } from '../../utils/key-generator.js';
import type { PrismaClient, DevlogEntry as PrismaDevlogEntry } from '@prisma/client';
import { PrismaServiceBase } from '../../services/prisma-service-base.js';

interface DevlogServiceInstance {
  service: PrismaDevlogService;
  createdAt: number;
}

export class PrismaDevlogService extends PrismaServiceBase {
  private static instances: Map<number, DevlogServiceInstance> = new Map();
  private pgTrgmAvailable: boolean = false;

  private constructor(private projectId?: number) {
    super();
  }

  /**
   * Get or create a DevlogService instance for a specific project
   * Implements singleton pattern with TTL-based cleanup
   */
  static getInstance(projectId?: number): PrismaDevlogService {
    const id = projectId || 0;

    return this.getOrCreateInstance(this.instances, id, () => new PrismaDevlogService(projectId));
  }

  /**
   * Hook called when Prisma client is successfully connected
   */
  protected async onPrismaConnected(): Promise<void> {
    // Check for PostgreSQL extensions (similar to TypeORM version)
    await this.ensurePgTrgmExtension();
    console.log('[PrismaDevlogService] Service initialized for project:', this.projectId);
  }

  /**
   * Hook called when service is running in fallback mode
   */
  protected async onFallbackMode(): Promise<void> {
    console.log(
      '[PrismaDevlogService] Service initialized in fallback mode for project:',
      this.projectId,
    );
  }

  /**
   * Hook called during disposal for cleanup
   */
  protected async onDispose(): Promise<void> {
    // Remove from instances
    if (this.projectId !== undefined) {
      PrismaDevlogService.instances.delete(this.projectId);
    }
  }

  /**
   * Check and ensure pg_trgm extension is available for PostgreSQL text search
   */
  private async ensurePgTrgmExtension(): Promise<void> {
    try {
      // Check if we're using PostgreSQL
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl?.includes('postgresql')) {
        this.pgTrgmAvailable = false;
        return;
      }

      // Check for pg_trgm extension
      const result = await this.prismaClient!.$queryRaw<Array<{ installed: boolean }>>`
        SELECT EXISTS(
          SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'
        ) as installed;
      `;

      this.pgTrgmAvailable = result[0]?.installed || false;

      // Try to create extension if not available (requires superuser)
      if (!this.pgTrgmAvailable) {
        try {
          await this.prismaClient!.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_trgm;`;
          this.pgTrgmAvailable = true;
        } catch (error) {
          console.warn('[PrismaDevlogService] pg_trgm extension not available:', error);
        }
      }
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

      const created = await this.prismaClient!.devlogEntry.create({
        data: {
          key,
          title: validatedEntry.data.title,
          type: validatedEntry.data.type,
          description: validatedEntry.data.description,
          status: validatedEntry.data.status,
          priority: validatedEntry.data.priority,
          assignee: validatedEntry.data.assignee,
          projectId: validatedEntry.data.projectId || this.projectId!,
          businessContext: validatedEntry.data.businessContext,
          technicalContext: validatedEntry.data.technicalContext,
          tags: entry.acceptanceCriteria ? JSON.stringify(entry.acceptanceCriteria) : null,
          files: null, // Will be handled separately through documents
          dependencies: null, // Will be handled separately through dependencies table
        },
        include: {
          notes: true,
          documents: true,
        },
      });

      return this.mapPrismaToDevlogEntry(created);
    } catch (error) {
      console.error('[PrismaDevlogService] Failed to create devlog entry:', error);
      throw new Error(
        `Failed to create devlog entry: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get a devlog entry by ID
   */
  async get(id: DevlogId): Promise<DevlogEntry | null> {
    await this.ensureInitialized();

    try {
      const entry = await this.prismaClient!.devlogEntry.findUnique({
        where: { id: Number(id) },
        include: {
          notes: true,
          documents: true,
          project: true,
        },
      });

      return entry ? this.mapPrismaToDevlogEntry(entry) : null;
    } catch (error) {
      console.error('[PrismaDevlogService] Failed to get devlog entry:', error);
      throw new Error(
        `Failed to get devlog entry: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get a devlog entry by key
   */
  async getByKey(key: string): Promise<DevlogEntry | null> {
    await this.ensureInitialized();

    try {
      const entry = await this.prismaClient!.devlogEntry.findUnique({
        where: { key },
        include: {
          notes: true,
          documents: true,
          project: true,
        },
      });

      return entry ? this.mapPrismaToDevlogEntry(entry) : null;
    } catch (error) {
      console.error('[PrismaDevlogService] Failed to get devlog entry by key:', error);
      throw new Error(
        `Failed to get devlog entry by key: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update a devlog entry
   */
  async update(id: DevlogId, updates: Partial<DevlogEntry>): Promise<DevlogEntry> {
    await this.ensureInitialized();

    try {
      // Prepare update data
      const updateData: any = {
        updatedAt: new Date(),
      };

      // Map fields to Prisma schema
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.assignee !== undefined) updateData.assignee = updates.assignee;
      if (updates.closedAt !== undefined)
        updateData.closedAt = updates.closedAt ? new Date(updates.closedAt) : null;
      if (updates.archived !== undefined) updateData.archived = updates.archived;

      // Handle context updates
      if (updates.businessContext !== undefined)
        updateData.businessContext = updates.businessContext;
      if (updates.technicalContext !== undefined)
        updateData.technicalContext = updates.technicalContext;
      if (updates.acceptanceCriteria !== undefined)
        updateData.tags = JSON.stringify(updates.acceptanceCriteria);

      const updated = await this.prismaClient!.devlogEntry.update({
        where: { id: Number(id) },
        data: updateData,
        include: {
          notes: true,
          documents: true,
          project: true,
        },
      });

      return this.mapPrismaToDevlogEntry(updated);
    } catch (error) {
      console.error('[PrismaDevlogService] Failed to update devlog entry:', error);
      throw new Error(
        `Failed to update devlog entry: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete a devlog entry
   */
  async delete(id: DevlogId): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.prismaClient!.devlogEntry.delete({
        where: { id: Number(id) },
      });
    } catch (error) {
      console.error('[PrismaDevlogService] Failed to delete devlog entry:', error);
      throw new Error(
        `Failed to delete devlog entry: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * List devlog entries with filtering and pagination
   */
  async list(
    filter?: DevlogFilter,
    pagination?: { limit?: number; offset?: number },
    sort?: SortOptions,
  ): Promise<PaginatedResult<DevlogEntry>> {
    await this.ensureInitialized();

    try {
      // Build where clause
      const where: any = {};

      // Add project filter
      if (this.projectId) {
        where.projectId = this.projectId;
      }

      // Add filters
      if (filter?.status) where.status = { in: filter.status };
      if (filter?.type) where.type = { in: filter.type };
      if (filter?.priority) where.priority = { in: filter.priority };
      if (filter?.assignee) where.assignee = filter.assignee;
      if (filter?.archived !== undefined) where.archived = filter.archived;

      // Date range filters
      if (filter?.fromDate) where.createdAt = { gte: new Date(filter.fromDate) };
      if (filter?.toDate) {
        where.createdAt = { ...where.createdAt, lte: new Date(filter.toDate) };
      }

      // Build order by
      const orderBy: any = {};
      if (sort?.sortBy && sort?.sortOrder) {
        orderBy[sort.sortBy] = sort.sortOrder;
      } else {
        orderBy.updatedAt = 'desc'; // Default sort
      }

      // Execute queries
      const [entries, total] = await Promise.all([
        this.prismaClient!.devlogEntry.findMany({
          where,
          orderBy,
          take: pagination?.limit || 20,
          skip: pagination?.offset || 0,
          include: {
            notes: true,
            documents: true,
            project: true,
          },
        }),
        this.prismaClient!.devlogEntry.count({ where }),
      ]);

      const mappedEntries = entries.map((entry) => this.mapPrismaToDevlogEntry(entry));

      return {
        items: mappedEntries,
        pagination: {
          page: Math.floor((pagination?.offset || 0) / (pagination?.limit || 20)) + 1,
          limit: pagination?.limit || 20,
          total,
          totalPages: Math.ceil(total / (pagination?.limit || 20)),
        },
      };
    } catch (error) {
      console.error('[PrismaDevlogService] Failed to list devlog entries:', error);
      throw new Error(
        `Failed to list devlog entries: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
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
      // Build search conditions
      const where: any = {};

      // Add project filter
      if (this.projectId) {
        where.projectId = this.projectId;
      }

      // Add basic filters first
      if (filter?.status) where.status = { in: filter.status };
      if (filter?.type) where.type = { in: filter.type };
      if (filter?.priority) where.priority = { in: filter.priority };
      if (filter?.assignee) where.assignee = filter.assignee;
      if (filter?.archived !== undefined) where.archived = filter.archived;

      // Handle text search
      if (query) {
        if (this.pgTrgmAvailable) {
          // Use PostgreSQL trigram similarity for better search
          where.OR = [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { businessContext: { contains: query, mode: 'insensitive' } },
            { technicalContext: { contains: query, mode: 'insensitive' } },
          ];
        } else {
          // Fallback to simple text search
          where.OR = [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ];
        }
      }

      // Build order by with search relevance
      const orderBy: any = [];
      if (sortOptions?.sortBy && sortOptions?.sortOrder) {
        orderBy.push({ [sortOptions.sortBy]: sortOptions.sortOrder });
      } else {
        orderBy.push({ updatedAt: 'desc' });
      }

      // Execute search
      const [entries, total] = await Promise.all([
        this.prismaClient!.devlogEntry.findMany({
          where,
          orderBy,
          take: pagination?.limit || 20,
          skip: ((pagination?.page || 1) - 1) * (pagination?.limit || 20),
          include: {
            notes: true,
            documents: true,
            project: true,
          },
        }),
        this.prismaClient!.devlogEntry.count({ where }),
      ]);

      const mappedEntries = entries.map((entry) => this.mapPrismaToDevlogEntry(entry));

      return {
        items: mappedEntries,
        pagination: {
          page: pagination?.page || 1,
          limit: pagination?.limit || 20,
          total,
          totalPages: Math.ceil(total / (pagination?.limit || 20)),
        },
      };
    } catch (error) {
      console.error('[PrismaDevlogService] Failed to search devlog entries:', error);
      throw new Error(
        `Failed to search devlog entries: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get statistics for devlog entries
   */
  async getStats(filter?: DevlogFilter): Promise<DevlogStats> {
    await this.ensureInitialized();

    try {
      // Build where clause
      const where: any = {};
      if (this.projectId) where.projectId = this.projectId;
      if (filter?.status) where.status = { in: filter.status };
      if (filter?.type) where.type = { in: filter.type };
      if (filter?.priority) where.priority = { in: filter.priority };
      if (filter?.assignee) where.assignee = filter.assignee;
      if (filter?.archived !== undefined) where.archived = filter.archived;

      // Get aggregated statistics
      const [total, statusCounts, typeCounts, priorityCounts] = await Promise.all([
        this.prismaClient!.devlogEntry.count({ where }),
        this.prismaClient!.devlogEntry.groupBy({
          by: ['status'],
          where,
          _count: { status: true },
        }),
        this.prismaClient!.devlogEntry.groupBy({
          by: ['type'],
          where,
          _count: { type: true },
        }),
        this.prismaClient!.devlogEntry.groupBy({
          by: ['priority'],
          where,
          _count: { priority: true },
        }),
      ]);

      // Calculate open/closed counts
      const openStatuses = ['new', 'in-progress', 'blocked', 'in-review', 'testing'];
      const closedStatuses = ['done', 'cancelled'];

      const openCount = statusCounts
        .filter((s) => openStatuses.includes(s.status))
        .reduce((sum, s) => sum + s._count.status, 0);

      const closedCount = statusCounts
        .filter((s) => closedStatuses.includes(s.status))
        .reduce((sum, s) => sum + s._count.status, 0);

      return {
        totalEntries: total,
        openEntries: openCount,
        closedEntries: closedCount,
        byStatus: Object.fromEntries(
          statusCounts.map((s) => [s.status, s._count.status]),
        ) as Record<DevlogStatus, number>,
        byType: Object.fromEntries(typeCounts.map((t) => [t.type, t._count.type])) as Record<
          DevlogType,
          number
        >,
        byPriority: Object.fromEntries(
          priorityCounts.map((p) => [p.priority, p._count.priority]),
        ) as Record<DevlogPriority, number>,
        averageCompletionTime: undefined, // TODO: Calculate based on createdAt and closedAt
      };
    } catch (error) {
      console.error('[PrismaDevlogService] Failed to get stats:', error);
      throw new Error(
        `Failed to get devlog stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
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
          from:
            request.from ||
            new Date(Date.now() - (request.days || 30) * 24 * 60 * 60 * 1000).toISOString(),
          to: request.to || new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('[PrismaDevlogService] Failed to get time series:', error);
      throw new Error(
        `Failed to get time series: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Add a note to a devlog entry
   */
  async addNote(devlogId: DevlogId, note: { category: string; content: string }): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.prismaClient!.devlogNote.create({
        data: {
          id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          devlogId: Number(devlogId),
          timestamp: new Date(),
          category: note.category,
          content: note.content,
        },
      });
    } catch (error) {
      console.error('[PrismaDevlogService] Failed to add note:', error);
      throw new Error(
        `Failed to add note: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Map Prisma entity to DevlogEntry type
   */
  private mapPrismaToDevlogEntry(
    prismaEntry: PrismaDevlogEntry & {
      notes?: Array<{ id: string; timestamp: Date; category: string; content: string }>;
      documents?: Array<{
        id: string;
        filename: string;
        originalName: string;
        mimeType: string;
        size: number;
        type: string;
        textContent: string | null;
        metadata: any;
        uploadedBy: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>;
    },
  ): DevlogEntry {
    return {
      id: prismaEntry.id,
      key: prismaEntry.key,
      title: prismaEntry.title,
      type: prismaEntry.type as DevlogType,
      description: prismaEntry.description,
      status: prismaEntry.status as DevlogStatus,
      priority: prismaEntry.priority as DevlogPriority,
      createdAt: prismaEntry.createdAt.toISOString(),
      updatedAt: prismaEntry.updatedAt.toISOString(),
      closedAt: prismaEntry.closedAt?.toISOString() || null,
      archived: prismaEntry.archived,
      assignee: prismaEntry.assignee,
      projectId: prismaEntry.projectId,
      acceptanceCriteria: prismaEntry.tags ? JSON.parse(prismaEntry.tags) : undefined,
      businessContext: prismaEntry.businessContext,
      technicalContext: prismaEntry.technicalContext,
      notes:
        prismaEntry.notes?.map((note) => ({
          id: note.id,
          timestamp: note.timestamp.toISOString(),
          category: note.category as any,
          content: note.content,
        })) || [],
      documents:
        prismaEntry.documents?.map((doc) => ({
          id: doc.id,
          devlogId: prismaEntry.id,
          filename: doc.filename,
          originalName: doc.originalName,
          mimeType: doc.mimeType,
          size: doc.size,
          type: doc.type as any,
          content: doc.textContent || undefined,
          metadata: doc.metadata || {},
          uploadedAt: doc.createdAt.toISOString(),
          uploadedBy: doc.uploadedBy || undefined,
        })) || [],
    };
  }
}
