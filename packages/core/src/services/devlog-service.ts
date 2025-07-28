/**
 * DevlogService - Simplified business logic for devlog operations
 *
 * Replaces ProjectDevlogManager with a cleaner service-based approach
 * that uses direct TypeORM repositories instead of complex storage abstractions.
 */

import { DataSource, Repository } from 'typeorm';
import type {
  DevlogEntry,
  DevlogFilter,
  DevlogId,
  DevlogStats,
  PaginatedResult,
  TimeSeriesRequest,
  TimeSeriesStats,
} from '../types/index.js';
import type { ProjectContext } from '../types/project.js';
import {
  DevlogEntryEntity,
  ChatSessionEntity,
  ChatMessageEntity,
  ChatDevlogLinkEntity,
} from '../entities/index.js';

export interface DevlogServiceOptions {
  /** TypeORM database connection */
  database: DataSource;

  /** Project context for filtering operations */
  projectContext?: ProjectContext;
}

/**
 * DevlogService - Business logic for devlog operations
 */
export class DevlogService {
  private devlogRepository: Repository<DevlogEntryEntity>;
  private chatSessionRepository: Repository<ChatSessionEntity>;
  private chatMessageRepository: Repository<ChatMessageEntity>;
  private chatDevlogLinkRepository: Repository<ChatDevlogLinkEntity>;
  private initialized = false;

  constructor(private options: DevlogServiceOptions) {
    this.devlogRepository = this.options.database.getRepository(DevlogEntryEntity);
    this.chatSessionRepository = this.options.database.getRepository(ChatSessionEntity);
    this.chatMessageRepository = this.options.database.getRepository(ChatMessageEntity);
    this.chatDevlogLinkRepository = this.options.database.getRepository(ChatDevlogLinkEntity);
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure database connection is established
    if (!this.options.database.isInitialized) {
      await this.options.database.initialize();
    }

    this.initialized = true;
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    if (!this.initialized) return;

    // Note: We don't destroy the database connection here as it may be shared
    // The DatabaseService manages the connection lifecycle
    this.initialized = false;
  }

  /**
   * Set the current project context
   */
  setProjectContext(projectContext: ProjectContext): void {
    this.options.projectContext = projectContext;
  }

  /**
   * Get the current project context
   */
  getProjectContext(): ProjectContext | undefined {
    return this.options.projectContext;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('DevlogService not initialized. Call initialize() first.');
    }
  }

  /**
   * Add project filter to devlog filter if project context is available
   */
  private addProjectFilter(filter?: DevlogFilter): DevlogFilter {
    const projectFilter: DevlogFilter = { ...filter };

    // Add project-specific filtering using projectId
    if (this.options.projectContext) {
      projectFilter.projectId = this.options.projectContext.projectId;
    }

    return projectFilter;
  }

  /**
   * Add project ID to devlog entry
   */
  private addProjectId(entry: DevlogEntry): DevlogEntry {
    if (!this.options.projectContext) {
      return entry;
    }

    const updatedEntry = { ...entry };
    updatedEntry.projectId = this.options.projectContext.projectId;

    return updatedEntry;
  }

  // Devlog operations using direct repository access

  async exists(id: DevlogId): Promise<boolean> {
    this.ensureInitialized();
    const count = await this.devlogRepository.count({ where: { id } });
    return count > 0;
  }

  async get(id: DevlogId): Promise<DevlogEntry | null> {
    this.ensureInitialized();
    const entity = await this.devlogRepository.findOne({ where: { id } });

    if (!entity) {
      return null;
    }

    const entry = entity.toDevlogEntry();

    // Verify entry belongs to current project if project context is set
    if (this.options.projectContext) {
      if (entry.projectId !== this.options.projectContext.projectId) {
        return null; // Entry doesn't belong to current project
      }
    }

    return entry;
  }

  async save(entry: DevlogEntry): Promise<void> {
    this.ensureInitialized();
    const projectEntry = this.addProjectId(entry);

    // Convert to entity and save
    const entity = DevlogEntryEntity.fromDevlogEntry(projectEntry);
    await this.devlogRepository.save(entity);
  }

  async delete(id: DevlogId): Promise<void> {
    this.ensureInitialized();
    await this.devlogRepository.delete({ id });
  }

  async list(filter?: DevlogFilter): Promise<PaginatedResult<DevlogEntry>> {
    this.ensureInitialized();
    const projectFilter = this.addProjectFilter(filter);

    // Build TypeORM query based on filter
    const queryBuilder = this.devlogRepository.createQueryBuilder('devlog');

    // Apply project filter
    if (projectFilter.projectId !== undefined) {
      queryBuilder.andWhere('devlog.projectId = :projectId', {
        projectId: projectFilter.projectId,
      });
    }

    // Apply status filter
    if (projectFilter.status) {
      queryBuilder.andWhere('devlog.status IN (:...statuses)', { statuses: projectFilter.status });
    }

    // Apply priority filter
    if (projectFilter.priority) {
      queryBuilder.andWhere('devlog.priority IN (:...priorities)', {
        priorities: projectFilter.priority,
      });
    }

    // Apply pagination
    const pagination = projectFilter.pagination || { page: 1, limit: 20 };
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const offset = (page - 1) * limit;

    queryBuilder.skip(offset).take(limit);
    queryBuilder.orderBy('devlog.updatedAt', 'DESC');

    const [entities, total] = await queryBuilder.getManyAndCount();
    const entries = entities.map((entity) => entity.toDevlogEntry());

    return {
      items: entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasPreviousPage: page > 1,
        hasNextPage: offset + entries.length < total,
      },
    };
  }

  async search(query: string, filter?: DevlogFilter): Promise<PaginatedResult<DevlogEntry>> {
    this.ensureInitialized();
    const projectFilter = this.addProjectFilter(filter);

    const queryBuilder = this.devlogRepository.createQueryBuilder('devlog');

    // Apply search query
    queryBuilder
      .where('devlog.title LIKE :query', { query: `%${query}%` })
      .orWhere('devlog.description LIKE :query', { query: `%${query}%` })
      .orWhere('devlog.businessContext LIKE :query', { query: `%${query}%` })
      .orWhere('devlog.technicalContext LIKE :query', { query: `%${query}%` });

    // Apply project filter
    if (projectFilter.projectId !== undefined) {
      queryBuilder.andWhere('devlog.projectId = :projectId', {
        projectId: projectFilter.projectId,
      });
    }

    // Apply other filters
    if (projectFilter.status) {
      queryBuilder.andWhere('devlog.status IN (:...statuses)', { statuses: projectFilter.status });
    }

    if (projectFilter.priority) {
      queryBuilder.andWhere('devlog.priority IN (:...priorities)', {
        priorities: projectFilter.priority,
      });
    }

    // Apply pagination
    const pagination = projectFilter.pagination || { page: 1, limit: 20 };
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const offset = (page - 1) * limit;

    queryBuilder.skip(offset).take(limit);
    queryBuilder.orderBy('devlog.updatedAt', 'DESC');

    const [entities, total] = await queryBuilder.getManyAndCount();
    const entries = entities.map((entity) => entity.toDevlogEntry());

    return {
      items: entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasPreviousPage: page > 1,
        hasNextPage: offset + entries.length < total,
      },
    };
  }

  async getStats(filter?: DevlogFilter): Promise<DevlogStats> {
    this.ensureInitialized();
    const projectFilter = this.addProjectFilter(filter);

    const queryBuilder = this.devlogRepository.createQueryBuilder('devlog');

    // Apply project filter
    if (projectFilter.projectId !== undefined) {
      queryBuilder.where('devlog.projectId = :projectId', { projectId: projectFilter.projectId });
    }

    const totalEntries = await queryBuilder.getCount();

    // Get counts by status
    const statusCounts = await queryBuilder
      .select('devlog.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('devlog.status')
      .getRawMany();

    // Get counts by type
    const typeCounts = await queryBuilder
      .select('devlog.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('devlog.type')
      .getRawMany();

    // Get counts by priority
    const priorityCounts = await queryBuilder
      .select('devlog.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('devlog.priority')
      .getRawMany();

    const byStatus = statusCounts.reduce(
      (acc, { status, count }) => {
        acc[status] = parseInt(count);
        return acc;
      },
      {} as Record<string, number>,
    );

    const byType = typeCounts.reduce(
      (acc, { type, count }) => {
        acc[type] = parseInt(count);
        return acc;
      },
      {} as Record<string, number>,
    );

    const byPriority = priorityCounts.reduce(
      (acc, { priority, count }) => {
        acc[priority] = parseInt(count);
        return acc;
      },
      {} as Record<string, number>,
    );

    // Calculate open vs closed entries
    const openStatuses = ['new', 'in-progress', 'blocked', 'in-review', 'testing'];
    const closedStatuses = ['done', 'cancelled'];

    const openEntries = openStatuses.reduce((sum, status) => sum + (byStatus[status] || 0), 0);
    const closedEntries = closedStatuses.reduce((sum, status) => sum + (byStatus[status] || 0), 0);

    return {
      totalEntries,
      openEntries,
      closedEntries,
      byStatus: byStatus as Record<import('../types/index.js').DevlogStatus, number>,
      byType: byType as Record<import('../types/index.js').DevlogType, number>,
      byPriority: byPriority as Record<import('../types/index.js').DevlogPriority, number>,
    };
  }

  async getTimeSeriesStats(request?: TimeSeriesRequest): Promise<TimeSeriesStats> {
    this.ensureInitialized();

    // Calculate date range
    const days = request?.days || 30;
    const to = request?.to ? new Date(request.to) : new Date();
    const from = request?.from
      ? new Date(request.from)
      : new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // For now, return a basic implementation
    // This would need to be expanded based on specific time series requirements
    const queryBuilder = this.devlogRepository.createQueryBuilder('devlog');

    if (this.options.projectContext) {
      queryBuilder.where('devlog.projectId = :projectId', {
        projectId: this.options.projectContext.projectId,
      });
    }

    const entries = await queryBuilder
      .select('DATE(devlog.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('devlog.createdAt >= :from', { from: from.toISOString() })
      .andWhere('devlog.createdAt <= :to', { to: to.toISOString() })
      .groupBy('DATE(devlog.createdAt)')
      .orderBy('DATE(devlog.createdAt)', 'ASC')
      .getRawMany();

    // Convert to TimeSeriesDataPoint format
    const dataPoints = entries.map((entry) => ({
      date: entry.date,
      totalCreated: parseInt(entry.count), // Simplified - this should be cumulative
      totalClosed: 0, // Would need to query closed entries
      open: parseInt(entry.count), // Simplified
      dailyCreated: parseInt(entry.count),
      dailyClosed: 0,
    }));

    return {
      dataPoints,
      dateRange: {
        from: from.toISOString().split('T')[0], // YYYY-MM-DD format
        to: to.toISOString().split('T')[0],
      },
    };
  }

  async getNextId(): Promise<DevlogId> {
    this.ensureInitialized();

    const result = await this.devlogRepository
      .createQueryBuilder('devlog')
      .select('MAX(devlog.id)', 'maxId')
      .getRawOne();

    return (result?.maxId || 0) + 1;
  }

  // Chat operations using direct repository access

  async saveChatSession(session: any): Promise<void> {
    this.ensureInitialized();
    const entity = ChatSessionEntity.fromChatSession(session);
    await this.chatSessionRepository.save(entity);
  }

  async getChatSession(id: string): Promise<any> {
    this.ensureInitialized();
    const entity = await this.chatSessionRepository.findOne({ where: { id } });
    return entity ? entity.toChatSession() : null;
  }

  async listChatSessions(filter?: any, offset?: number, limit?: number): Promise<any[]> {
    this.ensureInitialized();

    const queryBuilder = this.chatSessionRepository.createQueryBuilder('session');

    if (offset !== undefined) {
      queryBuilder.skip(offset);
    }

    if (limit !== undefined) {
      queryBuilder.take(limit);
    }

    queryBuilder.orderBy('session.createdAt', 'DESC');

    const entities = await queryBuilder.getMany();
    return entities.map((entity) => entity.toChatSession());
  }

  async deleteChatSession(id: string): Promise<void> {
    this.ensureInitialized();
    await this.chatSessionRepository.delete({ id });
  }

  async saveChatMessages(messages: any[]): Promise<void> {
    this.ensureInitialized();
    const entities = messages.map((message) => ChatMessageEntity.fromChatMessage(message));
    await this.chatMessageRepository.save(entities);
  }

  async getChatMessages(sessionId: string, offset?: number, limit?: number): Promise<any[]> {
    this.ensureInitialized();

    const queryBuilder = this.chatMessageRepository
      .createQueryBuilder('message')
      .where('message.sessionId = :sessionId', { sessionId });

    if (offset !== undefined) {
      queryBuilder.skip(offset);
    }

    if (limit !== undefined) {
      queryBuilder.take(limit);
    }

    queryBuilder.orderBy('message.timestamp', 'ASC');

    const entities = await queryBuilder.getMany();
    return entities.map((entity) => entity.toChatMessage());
  }

  async searchChatContent(query: string, filter?: any, limit?: number): Promise<any[]> {
    this.ensureInitialized();

    const queryBuilder = this.chatMessageRepository
      .createQueryBuilder('message')
      .where('message.content LIKE :query', { query: `%${query}%` });

    if (limit !== undefined) {
      queryBuilder.take(limit);
    }

    queryBuilder.orderBy('message.timestamp', 'DESC');

    const entities = await queryBuilder.getMany();
    return entities.map((entity) => entity.toChatMessage());
  }

  async getChatStats(filter?: any): Promise<any> {
    this.ensureInitialized();

    const totalSessions = await this.chatSessionRepository.count();
    const totalMessages = await this.chatMessageRepository.count();

    return {
      totalSessions,
      totalMessages,
    };
  }

  async saveChatDevlogLink(link: any): Promise<void> {
    this.ensureInitialized();
    const entity = ChatDevlogLinkEntity.fromChatDevlogLink(link);
    await this.chatDevlogLinkRepository.save(entity);
  }

  async getChatDevlogLinks(sessionId?: string, devlogId?: DevlogId): Promise<any[]> {
    this.ensureInitialized();

    const queryBuilder = this.chatDevlogLinkRepository.createQueryBuilder('link');

    if (sessionId) {
      queryBuilder.andWhere('link.sessionId = :sessionId', { sessionId });
    }

    if (devlogId !== undefined) {
      queryBuilder.andWhere('link.devlogId = :devlogId', { devlogId });
    }

    const entities = await queryBuilder.getMany();
    return entities.map((entity) => entity.toChatDevlogLink());
  }

  async removeChatDevlogLink(sessionId: string, devlogId: DevlogId): Promise<void> {
    this.ensureInitialized();
    await this.chatDevlogLinkRepository.delete({ sessionId, devlogId });
  }

  async getChatWorkspaces(): Promise<any[]> {
    this.ensureInitialized();

    // Get unique workspace information from chat sessions
    const workspaces = await this.chatSessionRepository
      .createQueryBuilder('session')
      .select('DISTINCT session.workspace', 'workspace')
      .where('session.workspace IS NOT NULL')
      .getRawMany();

    return workspaces.map((w) => ({ workspace: w.workspace }));
  }

  async saveChatWorkspace(workspace: any): Promise<void> {
    this.ensureInitialized();
    // For now, this is a no-op since workspace info is stored in chat sessions
    // In the future, this could store workspace metadata in a separate table
  }
}
