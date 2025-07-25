/**
 * TypeORM-based storage provider for devlog entries
 * Supports PostgreSQL, MySQL, and SQLite through TypeORM
 */

import 'reflect-metadata';
import { DataSource, Like, Repository } from 'typeorm';
import {
  DevlogEntry,
  DevlogEvent,
  DevlogFilter,
  DevlogId,
  DevlogStats,
  PaginatedResult,
  StorageProvider,
  TimeSeriesRequest,
  TimeSeriesStats,
} from '@/types';
import { createPaginatedResult } from '../../utils/common.js';
import { DevlogEntryEntity } from '../../entities/devlog-entry.entity.js';
import { calculateDevlogStats, calculateTimeSeriesStats } from '../../storage/shared/index.js';
import { createDataSource, TypeORMStorageOptions } from '../typeorm/typeorm-config.js';
import {
  generateDateRange,
  generateTimeSeriesParams,
  generateTimeSeriesSQL,
  mapSQLRowsToDataPoints,
} from '../typeorm/sql-time-series.js';

export class TypeORMStorageProvider implements StorageProvider {
  private dataSource: DataSource;
  private repository?: Repository<DevlogEntryEntity>;
  private options: TypeORMStorageOptions;

  // Event subscription properties
  private eventCallbacks = new Set<(event: DevlogEvent) => void>();
  private isWatching = false;

  constructor(options: TypeORMStorageOptions) {
    this.options = options;
    this.dataSource = createDataSource(options);
  }

  async initialize(): Promise<void> {
    try {
      // Check if already initialized to prevent "already connected" errors in development
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
        console.log('[TypeORMStorage] Connected to database successfully');
      } else {
        console.log('[TypeORMStorage] Database connection already exists, reusing');
      }
      this.repository = this.dataSource.getRepository(DevlogEntryEntity);
    } catch (error) {
      throw new Error(`Failed to initialize TypeORM storage: ${error}`);
    }
  }

  async exists(id: DevlogId): Promise<boolean> {
    if (!this.repository) throw new Error('Storage not initialized');
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }

  async get(id: DevlogId): Promise<DevlogEntry | null> {
    if (!this.repository) throw new Error('Storage not initialized');

    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) return null;

    return this.entityToDevlogEntry(entity);
  }

  async save(entry: DevlogEntry): Promise<void> {
    if (!this.repository) throw new Error('Storage not initialized');

    const entity = this.devlogEntryToEntity(entry);
    await this.repository.save(entity);

    // Emit event for real-time updates
    this.emitEvent({
      type: entry.id ? 'updated' : 'created',
      timestamp: new Date().toISOString(),
      data: entry,
    });
  }

  /**
   * Delete a devlog entry (soft delete using archive)
   * @deprecated This method now performs soft deletion via archiving.
   * The entry is marked as archived instead of being physically deleted.
   */
  async delete(id: DevlogId): Promise<void> {
    if (!this.repository) throw new Error('Storage not initialized');

    const entry = await this.get(id);
    if (!entry) {
      return; // Entry doesn't exist, nothing to delete
    }

    // Mark as archived instead of deleting the record
    const archived: DevlogEntry = {
      ...entry,
      archived: true,
      updatedAt: new Date().toISOString(),
    };

    await this.repository.save(archived);

    this.emitEvent({
      type: 'deleted',
      timestamp: new Date().toISOString(),
      data: { id },
    });
  }

  async list(filter?: DevlogFilter): Promise<PaginatedResult<DevlogEntry>> {
    if (!this.repository) throw new Error('Storage not initialized');

    const queryBuilder = this.repository.createQueryBuilder('entry');

    // Apply filters
    if (filter) {
      if (filter.status && filter.status.length > 0) {
        queryBuilder.andWhere('entry.status IN (:...statuses)', { statuses: filter.status });
      }

      if (filter.type && filter.type.length > 0) {
        queryBuilder.andWhere('entry.type IN (:...types)', { types: filter.type });
      }

      if (filter.priority && filter.priority.length > 0) {
        queryBuilder.andWhere('entry.priority IN (:...priorities)', {
          priorities: filter.priority,
        });
      }

      if (filter.assignee) {
        queryBuilder.andWhere('entry.assignee = :assignee', { assignee: filter.assignee });
      }

      if (filter.fromDate) {
        queryBuilder.andWhere('entry.createdAt >= :fromDate', {
          fromDate: new Date(filter.fromDate),
        });
      }

      if (filter.toDate) {
        queryBuilder.andWhere('entry.createdAt <= :toDate', { toDate: new Date(filter.toDate) });
      }

      if (filter.search) {
        queryBuilder.andWhere('(entry.title ILIKE :search OR entry.description ILIKE :search)', {
          search: `%${filter.search}%`,
        });
      }

      if (filter.archived !== undefined) {
        queryBuilder.andWhere('entry.archived = :archived', { archived: filter.archived });
      } else {
        // Default behavior: exclude archived entries unless explicitly requested
        queryBuilder.andWhere('entry.archived = :archived', { archived: false });
      }
    } else {
      // Even without filter, exclude archived entries by default
      queryBuilder.andWhere('entry.archived = :archived', { archived: false });
    }

    // Apply sorting
    const sortBy = filter?.pagination?.sortBy || 'updatedAt';
    const sortOrder = filter?.pagination?.sortOrder || 'desc';
    queryBuilder.orderBy(`entry.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // Apply pagination
    const page = filter?.pagination?.page || 1;
    const limit = filter?.pagination?.limit || 100;
    const offset = (page - 1) * limit;

    queryBuilder.skip(offset).take(limit);

    const [entities, total] = await queryBuilder.getManyAndCount();
    const entries = entities.map((entity) => this.entityToDevlogEntry(entity));

    // Calculate pagination metadata manually since we have the total from the query
    const totalPages = Math.ceil(total / limit);
    const hasPreviousPage = page > 1;
    const hasNextPage = page < totalPages;

    return {
      items: entries,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasPreviousPage,
        hasNextPage,
      },
    };
  }

  async search(query: string, filter?: DevlogFilter): Promise<PaginatedResult<DevlogEntry>> {
    if (!this.repository) throw new Error('Storage not initialized');

    const queryBuilder = this.repository.createQueryBuilder('entry');

    // Add search conditions
    queryBuilder.where('(entry.title ILIKE :query OR entry.description ILIKE :query)', {
      query: `%${query}%`,
    });

    // Apply archived filter (exclude archived by default)
    if (filter?.archived !== undefined) {
      queryBuilder.andWhere('entry.archived = :archived', { archived: filter.archived });
    } else {
      // Default behavior: exclude archived entries unless explicitly requested
      queryBuilder.andWhere('entry.archived = :archived', { archived: false });
    }

    // Apply other filters if provided
    if (filter?.status && filter.status.length > 0) {
      queryBuilder.andWhere('entry.status IN (:...statuses)', { statuses: filter.status });
    }
    if (filter?.type && filter.type.length > 0) {
      queryBuilder.andWhere('entry.type IN (:...types)', { types: filter.type });
    }
    if (filter?.priority && filter.priority.length > 0) {
      queryBuilder.andWhere('entry.priority IN (:...priorities)', { priorities: filter.priority });
    }

    // Apply sorting
    queryBuilder.orderBy('entry.updatedAt', 'DESC');

    // Apply pagination
    const pagination = filter?.pagination || { page: 1, limit: 100 };
    const offset = (pagination.page! - 1) * pagination.limit!;
    queryBuilder.skip(offset).take(pagination.limit);

    const [entities, total] = await queryBuilder.getManyAndCount();
    const entries = entities.map((entity) => this.entityToDevlogEntry(entity));

    return {
      items: entries,
      pagination: {
        page: pagination.page!,
        limit: pagination.limit!,
        total,
        totalPages: Math.ceil(total / pagination.limit!),
        hasNextPage: offset + entries.length < total,
        hasPreviousPage: pagination.page! > 1,
      },
    };
  }

  async getStats(filter?: DevlogFilter): Promise<DevlogStats> {
    if (!this.repository) throw new Error('Storage not initialized');

    // For now, get all entries and calculate stats (can be optimized later with SQL)
    const allEntries = await this.list({
      ...filter,
      pagination: {
        page: 1,
        limit: 1_000_000, // Fetch a large number to calculate stats
      },
    });
    return calculateDevlogStats(allEntries.items);
  }

  async getTimeSeriesStats(request: TimeSeriesRequest = {}): Promise<TimeSeriesStats> {
    if (!this.repository) throw new Error('Storage not initialized');

    try {
      // For database providers, use optimized SQL queries when possible
      if (this.options.type === 'postgres' || this.options.type === 'mysql') {
        return await this.getTimeSeriesStatsWithSQL(request);
      }

      // For SQLite, we can also use SQL but might want to fall back to the utility function
      // Let's try SQL first and fallback if there are issues
      if (this.options.type === 'sqlite') {
        try {
          return await this.getTimeSeriesStatsWithSQL(request);
        } catch (sqlError) {
          console.warn(
            '[TypeORMStorage] SQL time series failed for SQLite, falling back to utility function:',
            sqlError,
          );
          return await this.getTimeSeriesStatsWithUtility(request);
        }
      }

      // Fallback for any unsupported database types
      return await this.getTimeSeriesStatsWithUtility(request);
    } catch (error) {
      console.error('[TypeORMStorage] Time series calculation failed:', error);
      // Return empty data as fallback to prevent dashboard errors
      const dateRange = generateDateRange(request);
      return {
        dataPoints: [],
        dateRange,
      };
    }
  }

  /**
   * Get time series stats using optimized SQL queries
   * Works for PostgreSQL, MySQL, and SQLite
   */
  private async getTimeSeriesStatsWithSQL(
    request: TimeSeriesRequest = {},
  ): Promise<TimeSeriesStats> {
    if (!this.repository) throw new Error('Storage not initialized');

    // Map our database type to SQL dialect
    const sqlDialect =
      this.options.type === 'postgres'
        ? 'postgresql'
        : this.options.type === 'mysql'
          ? 'mysql'
          : 'sqlite';

    // Generate SQL query and parameters
    const sql = generateTimeSeriesSQL(sqlDialect);
    const params = generateTimeSeriesParams(request);

    // Execute raw SQL query
    const rows = await this.dataSource.query(sql, params);

    // Map SQL results to data points
    const dataPoints = mapSQLRowsToDataPoints(rows);
    const dateRange = generateDateRange(request);

    return {
      dataPoints,
      dateRange,
    };
  }

  /**
   * Get time series stats using the shared utility function
   * Fallback method that works by loading all entries
   */
  private async getTimeSeriesStatsWithUtility(
    request: TimeSeriesRequest = {},
  ): Promise<TimeSeriesStats> {
    if (!this.repository) throw new Error('Storage not initialized');

    // Load all entries (not paginated for accurate calculations)
    const allEntities = await this.repository.find();
    const allDevlogs = allEntities.map((entity) => this.entityToDevlogEntry(entity));

    // Use shared calculation logic
    return calculateTimeSeriesStats(allDevlogs, request);
  }

  async cleanup(): Promise<void> {
    await this.stopWatching();
    this.eventCallbacks.clear();

    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
    }
  }

  async getNextId(): Promise<DevlogId> {
    if (!this.repository) throw new Error('Storage not initialized');

    const result = await this.repository
      .createQueryBuilder('entry')
      .select('MAX(entry.id)', 'maxId')
      .getRawOne();

    return (result?.maxId || 0) + 1;
  }

  isRemoteStorage(): boolean {
    return this.options.type !== 'sqlite';
  }

  isGitBased(): boolean {
    return false;
  }

  // ===== Entity Conversion Methods =====

  private entityToDevlogEntry(entity: DevlogEntryEntity): DevlogEntry {
    return {
      id: entity.id,
      key: entity.key,
      title: entity.title,
      type: entity.type,
      description: entity.description,
      status: entity.status,
      priority: entity.priority,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      closedAt: entity.closedAt?.toISOString(),
      archived: entity.archived,
      assignee: entity.assignee,
      notes: this.parseJsonField(entity.notes, []),
      files: this.parseJsonField(entity.files, []),
      relatedDevlogs: this.parseJsonField(entity.relatedDevlogs, []),
      context: this.parseJsonField(entity.context, undefined),
      aiContext: this.parseJsonField(entity.aiContext, undefined),
      externalReferences: this.parseJsonField(entity.externalReferences, []),
    };
  }

  private devlogEntryToEntity(entry: DevlogEntry): DevlogEntryEntity {
    const entity = new DevlogEntryEntity();

    if (entry.id) entity.id = entry.id;
    entity.key = entry.key || '';
    entity.title = entry.title;
    entity.type = entry.type;
    entity.description = entry.description;
    entity.status = entry.status;
    entity.priority = entry.priority;
    entity.createdAt = new Date(entry.createdAt);
    entity.updatedAt = new Date(entry.updatedAt);
    if (entry.closedAt) entity.closedAt = new Date(entry.closedAt);
    entity.archived = entry.archived || false;
    entity.assignee = entry.assignee;
    entity.notes = this.stringifyJsonField(entry.notes || []);
    entity.files = this.stringifyJsonField(entry.files || []);
    entity.relatedDevlogs = this.stringifyJsonField(entry.relatedDevlogs || []);
    entity.context = this.stringifyJsonField(entry.context);
    entity.aiContext = this.stringifyJsonField(entry.aiContext);
    entity.externalReferences = this.stringifyJsonField(entry.externalReferences || []);

    return entity;
  }

  // Helper methods for JSON field handling (database-specific)
  private parseJsonField<T>(value: any, defaultValue: T): T {
    if (value === null || value === undefined) {
      return defaultValue;
    }

    // For SQLite, values are stored as text and need parsing
    if (this.options.type === 'sqlite' && typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    }

    // For PostgreSQL and MySQL, JSON fields are handled natively
    return value;
  }

  private stringifyJsonField(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    // For SQLite, we need to stringify JSON data
    if (this.options.type === 'sqlite') {
      return typeof value === 'string' ? value : JSON.stringify(value);
    }

    // For PostgreSQL and MySQL, return the object directly
    return value;
  }

  // ===== Event Subscription Operations =====

  async subscribe(callback: (event: DevlogEvent) => void): Promise<() => void> {
    this.eventCallbacks.add(callback);

    // Start watching if this is the first subscription
    if (this.eventCallbacks.size === 1 && !this.isWatching) {
      await this.startWatching();
    }

    // Return unsubscribe function
    return () => {
      this.eventCallbacks.delete(callback);
      // Stop listening if no more callbacks
      if (this.eventCallbacks.size === 0 && this.isWatching) {
        this.stopWatching();
      }
    };
  }

  async startWatching(): Promise<void> {
    this.isWatching = true;
    // TODO: Implement database-specific change notifications
    // For PostgreSQL: LISTEN/NOTIFY
    // For MySQL: Polling or triggers
    // For SQLite: File watching
    console.log('[TypeORMStorage] Started watching for changes');
  }

  async stopWatching(): Promise<void> {
    this.isWatching = false;
    console.log('[TypeORMStorage] Stopped watching for changes');
  }

  private emitEvent(event: DevlogEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('[TypeORMStorage] Error in event callback:', error);
      }
    }
  }

  // ===== Chat Storage Operations (TODO: Implement) =====

  async saveChatSession(): Promise<void> {
    throw new Error('Chat storage not yet implemented for TypeORM provider.');
  }

  async getChatSession(): Promise<null> {
    throw new Error('Chat storage not yet implemented for TypeORM provider.');
  }

  async listChatSessions(): Promise<[]> {
    throw new Error('Chat storage not yet implemented for TypeORM provider.');
  }

  async deleteChatSession(): Promise<void> {
    throw new Error('Chat storage not yet implemented for TypeORM provider.');
  }

  async saveChatMessages(): Promise<void> {
    throw new Error('Chat storage not yet implemented for TypeORM provider.');
  }

  async getChatMessages(): Promise<[]> {
    throw new Error('Chat storage not yet implemented for TypeORM provider.');
  }

  async searchChatContent(): Promise<[]> {
    throw new Error('Chat storage not yet implemented for TypeORM provider.');
  }

  async getChatStats(): Promise<any> {
    throw new Error('Chat storage not yet implemented for TypeORM provider.');
  }

  async saveChatDevlogLink(): Promise<void> {
    throw new Error('Chat storage not yet implemented for TypeORM provider.');
  }

  async getChatDevlogLinks(): Promise<[]> {
    throw new Error('Chat storage not yet implemented for TypeORM provider.');
  }

  async removeChatDevlogLink(): Promise<void> {
    throw new Error('Chat storage not yet implemented for TypeORM provider.');
  }

  async getChatWorkspaces(): Promise<[]> {
    throw new Error('Chat storage not yet implemented for TypeORM provider.');
  }

  async saveChatWorkspace(): Promise<void> {
    throw new Error('Chat storage not yet implemented for TypeORM provider.');
  }
}
