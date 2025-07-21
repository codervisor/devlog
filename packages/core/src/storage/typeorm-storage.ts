/**
 * TypeORM-based storage provider for devlog entries
 * Supports PostgreSQL, MySQL, and SQLite through TypeORM
 */

import 'reflect-metadata';
import { DataSource, Repository, Like, In, Between } from 'typeorm';
import {
  DevlogEntry,
  DevlogFilter,
  DevlogId,
  DevlogStats,
  PaginatedResult,
  StorageProvider,
  TimeSeriesRequest,
  TimeSeriesStats,
} from '../types/index.js';
import type { DevlogEvent } from '../events/devlog-events.js';
import { calculateDevlogStats } from '../utils/storage.js';
import { createPaginatedResult } from '../utils/common.js';
import { DevlogEntryEntity } from '../entities/devlog-entry.entity.js';
import { createDataSource, TypeORMStorageOptions } from './typeorm-config.js';

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
      await this.dataSource.initialize();
      this.repository = this.dataSource.getRepository(DevlogEntryEntity);
      console.log('[TypeORMStorage] Connected to database successfully');
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

  async delete(id: DevlogId): Promise<void> {
    if (!this.repository) throw new Error('Storage not initialized');
    
    const entry = await this.get(id);
    await this.repository.delete(id);

    if (entry) {
      this.emitEvent({
        type: 'deleted',
        timestamp: new Date().toISOString(),
        data: { id },
      });
    }
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
        queryBuilder.andWhere('entry.priority IN (:...priorities)', { priorities: filter.priority });
      }

      if (filter.assignee) {
        queryBuilder.andWhere('entry.assignee = :assignee', { assignee: filter.assignee });
      }

      if (filter.fromDate) {
        queryBuilder.andWhere('entry.createdAt >= :fromDate', { fromDate: new Date(filter.fromDate) });
      }

      if (filter.toDate) {
        queryBuilder.andWhere('entry.createdAt <= :toDate', { toDate: new Date(filter.toDate) });
      }

      if (filter.search) {
        queryBuilder.andWhere(
          '(entry.title ILIKE :search OR entry.description ILIKE :search)',
          { search: `%${filter.search}%` }
        );
      }

      if (filter.archived !== undefined) {
        queryBuilder.andWhere('entry.archived = :archived', { archived: filter.archived });
      }
    }

    // Apply sorting
    const sortBy = filter?.pagination?.sortBy || 'updatedAt';
    const sortOrder = filter?.pagination?.sortOrder || 'desc';
    queryBuilder.orderBy(`entry.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // Apply pagination
    const page = filter?.pagination?.page || 1;
    const limit = filter?.pagination?.limit || 100;
    const offset = ((page - 1) * limit);

    queryBuilder.skip(offset).take(limit);

    const [entities, total] = await queryBuilder.getManyAndCount();
    const entries = entities.map(entity => this.entityToDevlogEntry(entity));

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

  async search(query: string): Promise<PaginatedResult<DevlogEntry>> {
    if (!this.repository) throw new Error('Storage not initialized');

    const entities = await this.repository.find({
      where: [
        { title: Like(`%${query}%`) },
        { description: Like(`%${query}%`) },
      ],
      order: { updatedAt: 'DESC' },
    });

    const entries = entities.map(entity => this.entityToDevlogEntry(entity));
    return createPaginatedResult(entries, { page: 1, limit: 100 });
  }

  async getStats(filter?: DevlogFilter): Promise<DevlogStats> {
    if (!this.repository) throw new Error('Storage not initialized');

    // For now, get all entries and calculate stats (can be optimized later with SQL)
    const allEntries = await this.list(filter);
    return calculateDevlogStats(allEntries.items);
  }

  async getTimeSeriesStats(request: TimeSeriesRequest = {}): Promise<TimeSeriesStats> {
    if (!this.repository) throw new Error('Storage not initialized');

    // TODO: Implement time series queries with TypeORM
    // For now, return empty data
    const days = request.days || 30;
    const to = request.to ? new Date(request.to) : new Date();
    const from = request.from ? new Date(request.from) : new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

    return {
      dataPoints: [],
      dateRange: {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
      },
    };
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
      notes: entity.notes || [],
      files: entity.files || [],
      relatedDevlogs: entity.relatedDevlogs || [],
      context: entity.context,
      aiContext: entity.aiContext,
      externalReferences: entity.externalReferences || [],
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
    entity.notes = entry.notes || [];
    entity.files = entry.files || [];
    entity.relatedDevlogs = entry.relatedDevlogs || [];
    entity.context = entry.context;
    entity.aiContext = entry.aiContext;
    entity.externalReferences = entry.externalReferences || [];

    return entity;
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
