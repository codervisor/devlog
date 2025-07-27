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
  ChatSession,
  ChatMessage,
  ChatSessionId,
  ChatFilter,
  ChatSearchResult,
  ChatStats,
  ChatDevlogLink,
  ChatWorkspace,
} from '@/types';
import { createPaginatedResult } from '../../utils/common.js';
import {
  DevlogEntryEntity,
  ChatSessionEntity,
  ChatMessageEntity,
  ChatDevlogLinkEntity,
} from '../../entities/index.js';
import { calculateDevlogStats, calculateTimeSeriesStats } from '../../storage/shared/index.js';
import { createDataSource, TypeORMStorageOptions } from '../typeorm/typeorm-config.js';
import { initializeChatTables } from '../typeorm/chat-schema.js';
import {
  generateDateRange,
  generateTimeSeriesParams,
  generateTimeSeriesSQL,
  mapSQLRowsToDataPoints,
} from '../typeorm/sql-time-series.js';

export class TypeORMStorageProvider implements StorageProvider {
  private dataSource: DataSource;
  private repository?: Repository<DevlogEntryEntity>;
  private chatSessionRepository?: Repository<ChatSessionEntity>;
  private chatMessageRepository?: Repository<ChatMessageEntity>;
  private chatDevlogLinkRepository?: Repository<ChatDevlogLinkEntity>;
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

      // Initialize repositories
      this.repository = this.dataSource.getRepository(DevlogEntryEntity);
      this.chatSessionRepository = this.dataSource.getRepository(ChatSessionEntity);
      this.chatMessageRepository = this.dataSource.getRepository(ChatMessageEntity);
      this.chatDevlogLinkRepository = this.dataSource.getRepository(ChatDevlogLinkEntity);

      // Initialize chat tables for SQLite (other databases use migration/synchronize)
      if (this.options.type === 'sqlite') {
        try {
          initializeChatTables(this.dataSource.manager.connection.driver.database);
          console.log('[TypeORMStorage] Chat tables initialized for SQLite');
        } catch (error) {
          console.warn('[TypeORMStorage] Chat table initialization warning:', error);
          // Don't fail initialization if chat tables already exist
        }
      }
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
      files: this.parseJsonField(entity.files, []),
      relatedDevlogs: this.parseJsonField(entity.relatedDevlogs, []),
      acceptanceCriteria: this.parseJsonField(entity.acceptanceCriteria, []),
      businessContext: entity.businessContext,
      technicalContext: entity.technicalContext,
      // Related entities will be loaded separately when needed
      notes: [], // TODO: Load from DevlogNoteEntity
      dependencies: [], // TODO: Load from DevlogDependencyEntity
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
    entity.files = this.stringifyJsonField(entry.files || []);
    entity.relatedDevlogs = this.stringifyJsonField(entry.relatedDevlogs || []);
    entity.acceptanceCriteria = this.stringifyJsonField(entry.acceptanceCriteria || []);
    entity.businessContext = entry.businessContext;
    entity.technicalContext = entry.technicalContext;

    // Related entities (notes, dependencies, externalReferences)
    // will be handled separately through their respective repositories

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

  // ===== Chat Entity Conversion Methods =====

  private entityToChatSession(entity: ChatSessionEntity): ChatSession {
    return {
      id: entity.id,
      agent: entity.agent,
      timestamp: entity.timestamp,
      workspace: entity.workspace,
      workspacePath: entity.workspacePath,
      title: entity.title,
      status: entity.status,
      messageCount: entity.messageCount,
      duration: entity.duration,
      metadata: this.parseJsonField(entity.metadata, {}),
      tags: this.parseJsonField(entity.tags, []),
      importedAt: entity.importedAt,
      updatedAt: entity.updatedAt,
      linkedDevlogs: [], // TODO: Load linked devlogs if needed
      archived: entity.archived,
    };
  }

  private chatSessionToEntity(session: ChatSession): ChatSessionEntity {
    const entity = new ChatSessionEntity();

    entity.id = session.id;
    entity.agent = session.agent;
    entity.timestamp = session.timestamp;
    entity.workspace = session.workspace;
    entity.workspacePath = session.workspacePath;
    entity.title = session.title;
    entity.status = session.status;
    entity.messageCount = session.messageCount;
    entity.duration = session.duration;
    entity.metadata = this.stringifyJsonField(session.metadata);
    entity.tags = this.stringifyJsonField(session.tags);
    entity.importedAt = session.importedAt;
    entity.updatedAt = session.updatedAt;
    entity.archived = session.archived;

    return entity;
  }

  private entityToChatMessage(entity: ChatMessageEntity): ChatMessage {
    return {
      id: entity.id,
      sessionId: entity.sessionId,
      role: entity.role,
      content: entity.content,
      timestamp: entity.timestamp,
      sequence: entity.sequence,
      metadata: this.parseJsonField(entity.metadata, {}),
      searchContent: entity.searchContent,
    };
  }

  private chatMessageToEntity(message: ChatMessage): ChatMessageEntity {
    const entity = new ChatMessageEntity();

    entity.id = message.id;
    entity.sessionId = message.sessionId;
    entity.role = message.role;
    entity.content = message.content;
    entity.timestamp = message.timestamp;
    entity.sequence = message.sequence;
    entity.metadata = this.stringifyJsonField(message.metadata);
    entity.searchContent = message.searchContent;

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

  // ===== Chat Storage Operations =====

  async saveChatSession(session: ChatSession): Promise<void> {
    if (!this.chatSessionRepository) throw new Error('Chat storage not initialized');

    try {
      const entity = this.chatSessionToEntity(session);
      await this.chatSessionRepository.save(entity);
      console.log(`[TypeORMStorage] Chat session saved: ${session.id}`);
    } catch (error: any) {
      console.error('[TypeORMStorage] Failed to save chat session:', error);
      throw new Error(`Failed to save chat session: ${error.message}`);
    }
  }

  async getChatSession(id: ChatSessionId): Promise<ChatSession | null> {
    if (!this.chatSessionRepository) throw new Error('Chat storage not initialized');

    try {
      const entity = await this.chatSessionRepository.findOne({ where: { id } });
      if (!entity) return null;

      return this.entityToChatSession(entity);
    } catch (error: any) {
      console.error('[TypeORMStorage] Failed to get chat session:', error);
      throw new Error(`Failed to get chat session: ${error.message}`);
    }
  }

  async listChatSessions(
    filter?: ChatFilter,
    offset?: number,
    limit?: number,
  ): Promise<ChatSession[]> {
    if (!this.chatSessionRepository) throw new Error('Chat storage not initialized');

    try {
      const queryBuilder = this.chatSessionRepository.createQueryBuilder('session');

      // Apply filters
      if (filter?.agent && filter.agent.length > 0) {
        queryBuilder.andWhere('session.agent IN (:...agents)', { agents: filter.agent });
      }

      if (filter?.status && filter.status.length > 0) {
        queryBuilder.andWhere('session.status IN (:...statuses)', { statuses: filter.status });
      }

      if (filter?.workspace && filter.workspace.length > 0) {
        queryBuilder.andWhere('session.workspace IN (:...workspaces)', {
          workspaces: filter.workspace,
        });
      }

      if (filter?.includeArchived !== undefined) {
        queryBuilder.andWhere('session.archived = :archived', {
          archived: !filter.includeArchived,
        });
      } else {
        // Default: exclude archived sessions
        queryBuilder.andWhere('session.archived = :archived', { archived: false });
      }

      if (filter?.fromDate) {
        queryBuilder.andWhere('session.timestamp >= :fromDate', { fromDate: filter.fromDate });
      }

      if (filter?.toDate) {
        queryBuilder.andWhere('session.timestamp <= :toDate', { toDate: filter.toDate });
      }

      // Apply ordering
      queryBuilder.orderBy('session.timestamp', 'DESC');

      // Apply pagination
      if (offset !== undefined) {
        queryBuilder.skip(offset);
      }
      if (limit !== undefined) {
        queryBuilder.take(limit);
      }

      const entities = await queryBuilder.getMany();
      return entities.map((entity) => this.entityToChatSession(entity));
    } catch (error: any) {
      console.error('[TypeORMStorage] Failed to list chat sessions:', error);
      throw new Error(`Failed to list chat sessions: ${error.message}`);
    }
  }

  async deleteChatSession(id: ChatSessionId): Promise<void> {
    if (!this.chatSessionRepository) throw new Error('Chat storage not initialized');

    try {
      // Soft delete by marking as archived
      const entity = await this.chatSessionRepository.findOne({ where: { id } });
      if (entity) {
        entity.archived = true;
        entity.updatedAt = new Date().toISOString();
        await this.chatSessionRepository.save(entity);
        console.log(`[TypeORMStorage] Chat session archived: ${id}`);
      }
    } catch (error: any) {
      console.error('[TypeORMStorage] Failed to delete chat session:', error);
      throw new Error(`Failed to delete chat session: ${error.message}`);
    }
  }

  async saveChatMessages(messages: ChatMessage[]): Promise<void> {
    if (!this.chatMessageRepository) throw new Error('Chat storage not initialized');

    try {
      const entities = messages.map((message) => this.chatMessageToEntity(message));
      await this.chatMessageRepository.save(entities);
      console.log(`[TypeORMStorage] Saved ${messages.length} chat messages`);
    } catch (error: any) {
      console.error('[TypeORMStorage] Failed to save chat messages:', error);
      throw new Error(`Failed to save chat messages: ${error.message}`);
    }
  }

  async getChatMessages(
    sessionId: ChatSessionId,
    offset?: number,
    limit?: number,
  ): Promise<ChatMessage[]> {
    if (!this.chatMessageRepository) throw new Error('Chat storage not initialized');

    try {
      const queryBuilder = this.chatMessageRepository.createQueryBuilder('message');

      queryBuilder.where('message.sessionId = :sessionId', { sessionId });
      queryBuilder.orderBy('message.sequence', 'ASC');

      if (offset !== undefined) {
        queryBuilder.skip(offset);
      }
      if (limit !== undefined) {
        queryBuilder.take(limit);
      }

      const entities = await queryBuilder.getMany();
      return entities.map((entity) => this.entityToChatMessage(entity));
    } catch (error: any) {
      console.error('[TypeORMStorage] Failed to get chat messages:', error);
      throw new Error(`Failed to get chat messages: ${error.message}`);
    }
  }

  async searchChatContent(
    query: string,
    filter?: ChatFilter,
    limit?: number,
  ): Promise<ChatSearchResult[]> {
    if (!this.chatMessageRepository || !this.chatSessionRepository) {
      throw new Error('Chat storage not initialized');
    }

    try {
      // For TypeORM with SQLite, we'll use raw SQL to access FTS
      let searchQuery = `
        SELECT DISTINCT 
          m.session_id,
          m.id as message_id,
          m.role,
          m.content,
          m.timestamp as message_timestamp,
          m.sequence,
          m.metadata as message_metadata,
          m.search_content,
          s.agent,
          s.workspace,
          s.title,
          s.status,
          s.timestamp as session_timestamp,
          s.message_count,
          s.duration,
          s.tags,
          s.imported_at,
          s.updated_at,
          s.archived
        FROM chat_messages_fts fts
        JOIN chat_messages m ON fts.rowid = m.rowid
        JOIN chat_sessions s ON m.session_id = s.id
        WHERE chat_messages_fts MATCH ?
      `;

      const params: any[] = [query];

      // Apply session-level filters
      if (filter?.agent && filter.agent.length > 0) {
        searchQuery += ` AND s.agent IN (${filter.agent.map(() => '?').join(',')})`;
        params.push(...filter.agent);
      }

      if (filter?.workspace && filter.workspace.length > 0) {
        searchQuery += ` AND s.workspace IN (${filter.workspace.map(() => '?').join(',')})`;
        params.push(...filter.workspace);
      }

      if (filter?.includeArchived !== true) {
        searchQuery += ` AND s.archived = ?`;
        params.push(0); // SQLite boolean as integer
      }

      searchQuery += ` ORDER BY s.timestamp DESC`;

      if (limit) {
        searchQuery += ` LIMIT ?`;
        params.push(limit);
      }

      const rawResults = await this.dataSource.query(searchQuery, params);

      // Group results by session
      const sessionMap = new Map<string, { session: ChatSession; messages: ChatMessage[] }>();

      for (const row of rawResults) {
        const sessionId = row.session_id;

        if (!sessionMap.has(sessionId)) {
          const session: ChatSession = {
            id: sessionId,
            agent: row.agent,
            timestamp: row.session_timestamp,
            workspace: row.workspace,
            title: row.title,
            status: row.status,
            messageCount: row.message_count,
            duration: row.duration,
            metadata: this.parseJsonField(row.metadata, {}),
            tags: this.parseJsonField(row.tags, []),
            importedAt: row.imported_at,
            updatedAt: row.updated_at,
            linkedDevlogs: [],
            archived: Boolean(row.archived),
          };

          sessionMap.set(sessionId, { session, messages: [] });
        }

        const message: ChatMessage = {
          id: row.message_id,
          sessionId: sessionId,
          role: row.role,
          content: row.content,
          timestamp: row.message_timestamp,
          sequence: row.sequence,
          metadata: this.parseJsonField(row.message_metadata, {}),
          searchContent: row.search_content,
        };

        sessionMap.get(sessionId)!.messages.push(message);
      }

      // Convert to search results
      const results: ChatSearchResult[] = [];
      for (const { session, messages } of sessionMap.values()) {
        results.push({
          session,
          messages: messages.map((message) => ({
            message,
            matchPositions: [], // TODO: Calculate actual match positions
            context: message.content.substring(0, 200), // First 200 chars as context
            score: 1.0, // TODO: Calculate relevance score
          })),
          relevance: 1.0, // TODO: Calculate overall relevance
          searchContext: {
            query,
            matchType: 'exact',
            totalMatches: messages.length,
          },
        });
      }

      return results;
    } catch (error: any) {
      console.error('[TypeORMStorage] Failed to search chat content:', error);
      throw new Error(`Failed to search chat content: ${error.message}`);
    }
  }

  async getChatStats(filter?: ChatFilter): Promise<ChatStats> {
    if (!this.chatSessionRepository || !this.chatMessageRepository) {
      throw new Error('Chat storage not initialized');
    }

    try {
      // Get session stats
      const sessionQueryBuilder = this.chatSessionRepository.createQueryBuilder('session');

      if (filter?.agent && filter.agent.length > 0) {
        sessionQueryBuilder.andWhere('session.agent IN (:...agents)', { agents: filter.agent });
      }

      if (filter?.includeArchived !== true) {
        sessionQueryBuilder.andWhere('session.archived = :archived', { archived: false });
      }

      const sessions = await sessionQueryBuilder.getMany();
      const totalSessions = sessions.length;
      const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);

      // Count by agent
      const byAgent: Record<string, number> = {};
      for (const session of sessions) {
        byAgent[session.agent] = (byAgent[session.agent] || 0) + 1;
      }

      // Count by status
      const byStatus: Record<string, number> = {};
      for (const session of sessions) {
        byStatus[session.status] = (byStatus[session.status] || 0) + 1;
      }

      // Count by workspace
      const byWorkspace: Record<string, any> = {};
      for (const session of sessions) {
        if (session.workspace) {
          if (!byWorkspace[session.workspace]) {
            byWorkspace[session.workspace] = {
              sessions: 0,
              messages: 0,
              firstSeen: session.timestamp,
              lastSeen: session.timestamp,
            };
          }
          byWorkspace[session.workspace].sessions++;
          byWorkspace[session.workspace].messages += session.messageCount;

          if (session.timestamp < byWorkspace[session.workspace].firstSeen) {
            byWorkspace[session.workspace].firstSeen = session.timestamp;
          }
          if (session.timestamp > byWorkspace[session.workspace].lastSeen) {
            byWorkspace[session.workspace].lastSeen = session.timestamp;
          }
        }
      }

      // Calculate date range
      const timestamps = sessions.map((s) => s.timestamp).sort();
      const dateRange = {
        earliest: timestamps.length > 0 ? timestamps[0] : null,
        latest: timestamps.length > 0 ? timestamps[timestamps.length - 1] : null,
      };

      // TODO: Calculate linkage stats by querying chat_devlog_links
      const linkageStats = {
        linked: 0,
        unlinked: totalSessions,
        multiLinked: 0,
      };

      return {
        totalSessions,
        totalMessages,
        byAgent: byAgent as any,
        byStatus: byStatus as any,
        byWorkspace,
        dateRange,
        linkageStats,
      };
    } catch (error: any) {
      console.error('[TypeORMStorage] Failed to get chat stats:', error);
      throw new Error(`Failed to get chat stats: ${error.message}`);
    }
  }

  async saveChatDevlogLink(link: ChatDevlogLink): Promise<void> {
    if (!this.chatDevlogLinkRepository) throw new Error('Chat storage not initialized');

    try {
      const entity = new ChatDevlogLinkEntity();
      entity.sessionId = link.sessionId;
      entity.devlogId = link.devlogId;
      entity.confidence = link.confidence;
      entity.reason = link.reason;
      entity.evidence = this.stringifyJsonField(link.evidence);
      entity.confirmed = link.confirmed || false;
      entity.createdAt = link.createdAt;
      entity.createdBy = link.createdBy;

      await this.chatDevlogLinkRepository.save(entity);
      console.log(`[TypeORMStorage] Chat-devlog link saved: ${link.sessionId} -> ${link.devlogId}`);
    } catch (error: any) {
      console.error('[TypeORMStorage] Failed to save chat-devlog link:', error);
      throw new Error(`Failed to save chat-devlog link: ${error.message}`);
    }
  }

  async getChatDevlogLinks(
    sessionId?: ChatSessionId,
    devlogId?: DevlogId,
  ): Promise<ChatDevlogLink[]> {
    if (!this.chatDevlogLinkRepository) throw new Error('Chat storage not initialized');

    try {
      const queryBuilder = this.chatDevlogLinkRepository.createQueryBuilder('link');

      if (sessionId) {
        queryBuilder.andWhere('link.sessionId = :sessionId', { sessionId });
      }

      if (devlogId) {
        queryBuilder.andWhere('link.devlogId = :devlogId', { devlogId });
      }

      const entities = await queryBuilder.getMany();

      return entities.map((entity) => ({
        sessionId: entity.sessionId,
        devlogId: entity.devlogId,
        confidence: entity.confidence,
        reason: entity.reason,
        evidence: this.parseJsonField(entity.evidence, {}),
        confirmed: entity.confirmed,
        createdAt: entity.createdAt,
        createdBy: entity.createdBy,
      }));
    } catch (error: any) {
      console.error('[TypeORMStorage] Failed to get chat-devlog links:', error);
      throw new Error(`Failed to get chat-devlog links: ${error.message}`);
    }
  }

  async removeChatDevlogLink(sessionId: ChatSessionId, devlogId: DevlogId): Promise<void> {
    if (!this.chatDevlogLinkRepository) throw new Error('Chat storage not initialized');

    try {
      await this.chatDevlogLinkRepository.delete({ sessionId, devlogId });
      console.log(`[TypeORMStorage] Chat-devlog link removed: ${sessionId} -> ${devlogId}`);
    } catch (error: any) {
      console.error('[TypeORMStorage] Failed to remove chat-devlog link:', error);
      throw new Error(`Failed to remove chat-devlog link: ${error.message}`);
    }
  }

  async getChatWorkspaces(): Promise<ChatWorkspace[]> {
    if (!this.chatSessionRepository) throw new Error('Chat storage not initialized');

    try {
      // Query unique workspaces with aggregated data
      const rawResults = await this.dataSource.query(`
        SELECT 
          workspace as id,
          workspace as name,
          '' as path,
          'Chat Session' as source,
          MIN(timestamp) as first_seen,
          MAX(timestamp) as last_seen,
          COUNT(*) as session_count,
          workspace as devlog_workspace,
          '{}' as metadata
        FROM chat_sessions 
        WHERE workspace IS NOT NULL AND workspace != ''
        GROUP BY workspace
        ORDER BY session_count DESC
      `);

      return rawResults.map((row: any) => ({
        id: row.id,
        name: row.name,
        path: row.path,
        source: row.source,
        firstSeen: row.first_seen,
        lastSeen: row.last_seen,
        sessionCount: row.session_count,
        devlogWorkspace: row.devlog_workspace,
        metadata: this.parseJsonField(row.metadata, {}),
      }));
    } catch (error: any) {
      console.error('[TypeORMStorage] Failed to get chat workspaces:', error);
      throw new Error(`Failed to get chat workspaces: ${error.message}`);
    }
  }

  async saveChatWorkspace(workspace: ChatWorkspace): Promise<void> {
    // For TypeORM implementation, workspaces are derived from sessions
    // This is a no-op since we don't have a separate workspaces table
    console.log(
      `[TypeORMStorage] Chat workspace save requested: ${workspace.name} (no-op for derived workspaces)`,
    );
  }
}
