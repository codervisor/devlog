/**
 * DevlogService - Simplified business logic for devlog operations
 *
 * Replaces ProjectDevlogManager with a cleaner service-based approach
 * that uses direct TypeORM repositories instead of complex storage abstractions.
 */

import { DataSource, Repository } from 'typeorm';
import { SelectQueryBuilder } from 'typeorm/query-builder/SelectQueryBuilder';
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
  TimeSeriesRequest,
  TimeSeriesStats,
} from '../types/index.js';
import { DevlogEntryEntity, DevlogNoteEntity } from '../entities/index.js';
import { getDataSource } from '../utils/typeorm-config.js';
import { getStorageType } from '../entities/decorators.js';
import { DevlogValidator } from '../validation/devlog-schemas.js';
import { generateDevlogKey } from '../utils/key-generator.js';

interface DevlogServiceInstance {
  service: DevlogService;
  createdAt: number;
}

export class DevlogService {
  private static instances: Map<number, DevlogServiceInstance> = new Map();
  private static readonly TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
  private database: DataSource;
  private devlogRepository: Repository<DevlogEntryEntity>;
  private noteRepository: Repository<DevlogNoteEntity>;
  private pgTrgmAvailable: boolean = false;
  private initPromise: Promise<void> | null = null;

  private constructor(private projectId?: number) {
    // Database initialization will happen in ensureInitialized()
    this.database = null as any; // Temporary placeholder
    this.devlogRepository = null as any; // Temporary placeholder
    this.noteRepository = null as any; // Temporary placeholder
  }

  /**
   * Initialize the database connection if not already initialized
   */
  private async ensureInitialized(): Promise<void> {
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
    try {
      if (!this.database || !this.database.isInitialized) {
        console.log('[DevlogService] Getting initialized DataSource...');
        this.database = await getDataSource();
        this.devlogRepository = this.database.getRepository(DevlogEntryEntity);
        this.noteRepository = this.database.getRepository(DevlogNoteEntity);
        console.log(
          '[DevlogService] DataSource ready with entities:',
          this.database.entityMetadatas.length,
        );
        console.log('[DevlogService] Repository initialized:', !!this.devlogRepository);

        // Check and ensure pg_trgm extension for PostgreSQL
        await this.ensurePgTrgmExtension();
      }
    } catch (error) {
      console.error('[DevlogService] Failed to initialize:', error);
      // Reset initPromise to allow retry
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Check and ensure pg_trgm extension is available for PostgreSQL
   */
  private async ensurePgTrgmExtension(): Promise<void> {
    try {
      const storageType = getStorageType();
      if (storageType !== 'postgres') {
        this.pgTrgmAvailable = false;
        return;
      }

      // Check if pg_trgm extension already exists
      const extensionCheck = await this.database.query(
        "SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'",
      );

      if (extensionCheck.length > 0) {
        this.pgTrgmAvailable = true;
        console.log('[DevlogService] pg_trgm extension is available');
        return;
      }

      // Try to create the extension
      try {
        await this.database.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        this.pgTrgmAvailable = true;
        console.log('[DevlogService] pg_trgm extension created successfully');
      } catch (createError) {
        console.warn('[DevlogService] Could not create pg_trgm extension:', createError);
        this.pgTrgmAvailable = false;
      }
    } catch (error) {
      console.warn('[DevlogService] Failed to check pg_trgm extension:', error);
      this.pgTrgmAvailable = false;
    }
  }

  /**
   * Get singleton instance for specific projectId with TTL. If TTL expired, create new instance.
   */
  static getInstance(projectId?: number): DevlogService {
    const instanceKey = projectId || 0; // Use 0 for undefined projectId
    const now = Date.now();
    const existingInstance = DevlogService.instances.get(instanceKey);

    if (!existingInstance || now - existingInstance.createdAt > DevlogService.TTL_MS) {
      const newService = new DevlogService(projectId);
      DevlogService.instances.set(instanceKey, {
        service: newService,
        createdAt: now,
      });
      return newService;
    }

    return existingInstance.service;
  }

  async get(id: DevlogId, includeNotes = true): Promise<DevlogEntry | null> {
    await this.ensureInitialized();

    // Validate devlog ID
    const idValidation = DevlogValidator.validateDevlogId(id);
    if (!idValidation.success) {
      throw new Error(`Invalid devlog ID: ${idValidation.errors.join(', ')}`);
    }

    const entity = await this.devlogRepository.findOne({ where: { id: idValidation.data } });

    if (!entity) {
      return null;
    }

    const devlogEntry = entity.toDevlogEntry();

    // Load notes if requested
    if (includeNotes) {
      devlogEntry.notes = await this.getNotes(id);
    }

    return devlogEntry;
  }

  /**
   * Get notes for a specific devlog entry
   */
  async getNotes(
    devlogId: DevlogId,
    limit?: number,
  ): Promise<import('../types/index.js').DevlogNote[]> {
    await this.ensureInitialized();

    // Validate devlog ID
    const idValidation = DevlogValidator.validateDevlogId(devlogId);
    if (!idValidation.success) {
      throw new Error(`Invalid devlog ID: ${idValidation.errors.join(', ')}`);
    }

    const queryBuilder = this.noteRepository
      .createQueryBuilder('note')
      .where('note.devlogId = :devlogId', { devlogId: idValidation.data })
      .orderBy('note.timestamp', 'DESC');

    if (limit && limit > 0) {
      queryBuilder.limit(limit);
    }

    const noteEntities = await queryBuilder.getMany();

    return noteEntities.map((entity) => ({
      id: entity.id,
      timestamp: entity.timestamp.toISOString(),
      category: entity.category,
      content: entity.content,
    }));
  }

  /**
   * Add a note to a devlog entry
   */
  async addNote(
    devlogId: DevlogId,
    noteData: Omit<import('../types/index.js').DevlogNote, 'id' | 'timestamp'>,
  ): Promise<import('../types/index.js').DevlogNote> {
    await this.ensureInitialized();

    // Validate devlog ID
    const idValidation = DevlogValidator.validateDevlogId(devlogId);
    if (!idValidation.success) {
      throw new Error(`Invalid devlog ID: ${idValidation.errors.join(', ')}`);
    }

    // Verify devlog exists
    const devlogExists = await this.devlogRepository.findOne({
      where: { id: idValidation.data },
      select: ['id'],
    });
    if (!devlogExists) {
      throw new Error(`Devlog with ID '${devlogId}' not found`);
    }

    // Generate consistent note ID
    const noteId = `note-${devlogId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = new Date();

    // Create note entity
    const noteEntity = new DevlogNoteEntity();
    noteEntity.id = noteId;
    noteEntity.devlogId = idValidation.data;
    noteEntity.timestamp = timestamp;
    noteEntity.category = noteData.category;
    noteEntity.content = noteData.content;

    // Save note
    const savedEntity = await this.noteRepository.save(noteEntity);

    return {
      id: savedEntity.id,
      timestamp: savedEntity.timestamp.toISOString(),
      category: savedEntity.category,
      content: savedEntity.content,
    };
  }

  /**
   * Update a note
   */
  async updateNote(
    noteId: string,
    updates: Partial<Omit<import('../types/index.js').DevlogNote, 'id' | 'timestamp'>>,
  ): Promise<import('../types/index.js').DevlogNote> {
    await this.ensureInitialized();

    // Find existing note
    const existingNote = await this.noteRepository.findOne({ where: { id: noteId } });
    if (!existingNote) {
      throw new Error(`Note with ID '${noteId}' not found`);
    }

    // Apply updates
    if (updates.category !== undefined) existingNote.category = updates.category;
    if (updates.content !== undefined) existingNote.content = updates.content;

    // Save updated note
    const savedEntity = await this.noteRepository.save(existingNote);

    return {
      id: savedEntity.id,
      timestamp: savedEntity.timestamp.toISOString(),
      category: savedEntity.category,
      content: savedEntity.content,
    };
  }

  /**
   * Delete a note
   */
  async deleteNote(noteId: string): Promise<void> {
    await this.ensureInitialized();

    const result = await this.noteRepository.delete({ id: noteId });
    if (result.affected === 0) {
      throw new Error(`Note with ID '${noteId}' not found`);
    }
  }

  /**
   * Get a specific note by ID
   */
  async getNote(noteId: string): Promise<import('../types/index.js').DevlogNote | null> {
    await this.ensureInitialized();

    const noteEntity = await this.noteRepository.findOne({ where: { id: noteId } });
    if (!noteEntity) {
      return null;
    }

    return {
      id: noteEntity.id,
      timestamp: noteEntity.timestamp.toISOString(),
      category: noteEntity.category,
      content: noteEntity.content,
    };
  }

  async save(entry: DevlogEntry): Promise<void> {
    await this.ensureInitialized();

    // Validate devlog entry data
    const validation = DevlogValidator.validateDevlogEntry(entry);
    if (!validation.success) {
      throw new Error(`Invalid devlog entry: ${validation.errors.join(', ')}`);
    }

    const validatedEntry = validation.data;

    // Generate a semantic key if not provided
    if (!validatedEntry.key) {
      validatedEntry.key = generateDevlogKey(
        validatedEntry.title,
        validatedEntry.type,
        validatedEntry.description,
      );
    }

    // Note: Status transition validation removed for workflow flexibility
    // Any status transition is now allowed

    // Validate unique key within project if key is provided
    if (validatedEntry.key && validatedEntry.projectId) {
      const keyValidation = await DevlogValidator.validateUniqueKey(
        validatedEntry.key,
        validatedEntry.projectId,
        validatedEntry.id,
        async (key: string, projectId: number, excludeId?: number) => {
          const existing = await this.devlogRepository.findOne({
            where: { key, projectId },
          });
          return !!existing && existing.id !== excludeId;
        },
      );

      if (!keyValidation.success) {
        throw new Error(keyValidation.error!);
      }
    }

    // Remove notes from entry - they should be managed separately using addNote/updateNote/deleteNote
    const entryWithoutNotes = { ...validatedEntry };
    delete entryWithoutNotes.notes; // Notes are handled via separate CRUD methods

    const entity = DevlogEntryEntity.fromDevlogEntry(entryWithoutNotes);
    await this.devlogRepository.save(entity);
  }

  async delete(id: DevlogId): Promise<void> {
    await this.ensureInitialized();

    // Validate devlog ID
    const idValidation = DevlogValidator.validateDevlogId(id);
    if (!idValidation.success) {
      throw new Error(`Invalid devlog ID: ${idValidation.errors.join(', ')}`);
    }

    const result = await this.devlogRepository.delete({ id: idValidation.data });
    if (result.affected === 0) {
      throw new Error(`Devlog with ID '${id}' not found`);
    }
    // Note: Notes will be cascade deleted due to foreign key constraint
  }

  async list(
    filter?: DevlogFilter,
    pagination?: PaginationMeta,
    sortOptions?: SortOptions,
  ): Promise<PaginatedResult<DevlogEntry>> {
    await this.ensureInitialized();

    const { projectFilter, queryBuilder } = this.prepareListQuery(filter);

    return await this.handleList(projectFilter, queryBuilder, pagination, sortOptions);
  }

  async search(
    query: string,
    filter?: DevlogFilter,
    pagination?: PaginationMeta,
    sortOptions?: SortOptions,
  ): Promise<PaginatedResult<DevlogEntry>> {
    await this.ensureInitialized();

    const { projectFilter, queryBuilder } = this.prepareListQuery(filter);

    // Apply search query
    queryBuilder
      .where('devlog.title LIKE :query', { query: `%${query}%` })
      .orWhere('devlog.description LIKE :query', { query: `%${query}%` })
      .orWhere('devlog.businessContext LIKE :query', { query: `%${query}%` })
      .orWhere('devlog.technicalContext LIKE :query', { query: `%${query}%` });

    return await this.handleList(projectFilter, queryBuilder, pagination, sortOptions);
  }

  /**
   * Enhanced search with database-level relevance scoring and optimized pagination
   */
  async searchWithRelevance(
    query: string,
    filter?: DevlogFilter,
    pagination?: PaginationMeta,
    sortOptions?: SortOptions,
  ): Promise<SearchPaginatedResult> {
    const searchStartTime = Date.now();
    await this.ensureInitialized();

    const { projectFilter, queryBuilder } = this.prepareListQuery(filter);

    // Apply database-specific search with relevance scoring
    const searchOptions = projectFilter.searchOptions || {};
    const storageType = getStorageType();
    await this.applyRelevanceSearch(queryBuilder, query, searchOptions, storageType);

    // Apply other filters
    await this.applySearchFilters(queryBuilder, projectFilter);

    // Apply pagination and sorting with relevance
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const totalCountQuery = queryBuilder.clone();
    const total = await totalCountQuery.getCount();

    // Apply sorting - relevance first, then secondary sort
    if (sortOptions?.sortBy === 'relevance' || !sortOptions?.sortBy) {
      queryBuilder.orderBy(
        'relevance_score',
        (sortOptions?.sortOrder?.toUpperCase() as 'ASC' | 'DESC') || 'DESC',
      );
      queryBuilder.addOrderBy('devlog.updatedAt', 'DESC');
    } else {
      const validSortColumns = [
        'id',
        'title',
        'type',
        'status',
        'priority',
        'createdAt',
        'updatedAt',
      ];
      if (validSortColumns.includes(sortOptions?.sortBy)) {
        queryBuilder.orderBy(
          `devlog.${sortOptions?.sortBy}`,
          (sortOptions?.sortOrder?.toUpperCase() as 'ASC' | 'DESC') || 'DESC',
        );
      } else {
        queryBuilder.orderBy('relevance_score', 'DESC');
      }
    }

    // Apply pagination
    queryBuilder.skip(offset).take(limit);

    // Execute query and transform results
    const rawResults = await queryBuilder.getRawAndEntities();
    const searchResults: SearchResult[] = rawResults.entities.map((entity, index) => {
      const rawData = rawResults.raw[index];
      const entry = entity.toDevlogEntry();

      return {
        entry,
        relevance: parseFloat(rawData.relevance_score || '0'),
        matchedFields: this.extractMatchedFields(entry, query),
        highlights: searchOptions.includeHighlights
          ? this.generateHighlights(entry, query)
          : undefined,
      };
    });

    const searchTime = Date.now() - searchStartTime;
    const totalPages = Math.ceil(total / limit);

    const searchMeta: SearchMeta = {
      query,
      searchTime,
      totalMatches: total,
      appliedFilters: {
        status: projectFilter.status,
        type: projectFilter.type,
        priority: projectFilter.priority,
        assignee: projectFilter.assignee,
        archived: projectFilter.archived,
        fromDate: projectFilter.fromDate,
        toDate: projectFilter.toDate,
      },
      searchEngine: storageType,
    };

    return {
      items: searchResults,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      searchMeta,
    };
  }

  async getStats(filter?: DevlogFilter): Promise<DevlogStats> {
    await this.ensureInitialized();

    // Validate filter if provided
    if (filter) {
      const filterValidation = DevlogValidator.validateFilter(filter);
      if (!filterValidation.success) {
        throw new Error(`Invalid filter: ${filterValidation.errors.join(', ')}`);
      }
      // Use validated filter for consistent behavior
      filter = filterValidation.data;
    }

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

  async getTimeSeriesStats(
    projectId: number,
    request?: TimeSeriesRequest,
  ): Promise<TimeSeriesStats> {
    await this.ensureInitialized();

    // Calculate date range
    const days = request?.days || 30;
    const to = request?.to ? new Date(request.to) : new Date();
    const from = request?.from
      ? new Date(request.from)
      : new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // For now, return a basic implementation
    // This would need to be expanded based on specific time series requirements
    const queryBuilder = this.devlogRepository.createQueryBuilder('devlog');

    queryBuilder.where('devlog.projectId = :projectId', {
      projectId: projectId,
    });

    const entries = await queryBuilder
      .select('DATE(devlog.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .andWhere('devlog.createdAt >= :from', { from: from.toISOString() })
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
    await this.ensureInitialized();

    const result = await this.devlogRepository
      .createQueryBuilder('devlog')
      .select('MAX(devlog.id)', 'maxId')
      .getRawOne();

    return (result?.maxId || 0) + 1;
  }

  private async handleList(
    filter: DevlogFilter,
    queryBuilder: SelectQueryBuilder<DevlogEntryEntity>,
    pagination?: PaginationMeta,
    sortOptions?: SortOptions,
  ): Promise<PaginatedResult<DevlogEntry>> {
    await this.applySearchFilters(queryBuilder, filter);

    // Apply search filter (if not already applied by search method)
    if (filter.search && !queryBuilder.getQueryAndParameters()[0].includes('LIKE')) {
      queryBuilder.andWhere(
        '(devlog.title LIKE :search OR devlog.description LIKE :search OR devlog.businessContext LIKE :search OR devlog.technicalContext LIKE :search)',
        { search: `%${filter.search}%` },
      );
    }

    // Apply pagination and sorting
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;
    const sortBy = sortOptions?.sortBy || 'updatedAt';
    const sortOrder = sortOptions?.sortOrder || 'desc';

    queryBuilder.skip(offset).take(limit);

    // Apply sorting
    const validSortColumns = [
      'id',
      'title',
      'type',
      'status',
      'priority',
      'createdAt',
      'updatedAt',
      'closedAt',
    ];
    if (validSortColumns.includes(sortBy)) {
      queryBuilder.orderBy(`devlog.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    } else {
      queryBuilder.orderBy('devlog.updatedAt', 'DESC');
    }

    const [entities, total] = await queryBuilder.getManyAndCount();
    const entries = entities.map((entity) => entity.toDevlogEntry());

    return {
      items: entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        // hasPreviousPage: page > 1,
        // hasNextPage: offset + entries.length < total,
      },
    };
  }

  /**
   * Add project filter to devlog filter if project context is available
   */
  private addProjectFilter(filter?: DevlogFilter): DevlogFilter {
    const projectFilter: DevlogFilter = { ...filter };

    // Add project-specific filtering using projectId
    if (this.projectId) {
      projectFilter.projectId = this.projectId;
    }

    return projectFilter;
  }

  /**
   * Apply simple concatenation-based search to query builder
   */
  private async applyRelevanceSearch(
    queryBuilder: SelectQueryBuilder<DevlogEntryEntity>,
    query: string,
    searchOptions: SearchOptions,
    storageType: string,
  ): Promise<void> {
    const minRelevance = searchOptions.minRelevance || 0.02;

    if (storageType === 'postgres') {
      // Use cached pgTrgmAvailable flag to avoid race conditions
      if (this.pgTrgmAvailable) {
        // PostgreSQL with pg_trgm similarity on concatenated fields
        queryBuilder
          .addSelect(
            `similarity(
              CONCAT(
                COALESCE(devlog.title, ''), ' ',
                COALESCE(devlog.description, ''), ' ',
                COALESCE(devlog.businessContext, ''), ' ',
                COALESCE(devlog.technicalContext, '')
              ), 
              :query
            )`,
            'relevance_score',
          )
          .where(
            `similarity(
              CONCAT(
                COALESCE(devlog.title, ''), ' ',
                COALESCE(devlog.description, ''), ' ',
                COALESCE(devlog.businessContext, ''), ' ',
                COALESCE(devlog.technicalContext, '')
              ), 
              :query
            ) > :minRelevance`,
          )
          .setParameter('query', query)
          .setParameter('minRelevance', minRelevance);
      } else {
        // Fallback to LIKE search if pg_trgm not available
        this.applySimpleLikeSearch(queryBuilder, query);
      }
    } else if (storageType === 'mysql') {
      // MySQL FULLTEXT search on concatenated fields
      queryBuilder
        .addSelect(
          `MATCH(devlog.title, devlog.description, devlog.businessContext, devlog.technicalContext) 
           AGAINST(:query IN NATURAL LANGUAGE MODE)`,
          'relevance_score',
        )
        .where(
          `MATCH(devlog.title, devlog.description, devlog.businessContext, devlog.technicalContext) 
           AGAINST(:query IN NATURAL LANGUAGE MODE)`,
        )
        .setParameter('query', query);
    } else {
      // Fallback to LIKE-based search for SQLite and other databases
      this.applySimpleLikeSearch(queryBuilder, query);
    }
  }

  /**
   * Simple LIKE-based search on concatenated fields
   */
  private applySimpleLikeSearch(
    queryBuilder: SelectQueryBuilder<DevlogEntryEntity>,
    query: string,
  ): void {
    queryBuilder
      .addSelect(
        `CASE 
          WHEN CONCAT(
            COALESCE(devlog.title, ''), ' ',
            COALESCE(devlog.description, ''), ' ',
            COALESCE(devlog.businessContext, ''), ' ',
            COALESCE(devlog.technicalContext, '')
          ) LIKE :exactQuery THEN 1.0
          WHEN CONCAT(
            COALESCE(devlog.title, ''), ' ',
            COALESCE(devlog.description, ''), ' ',
            COALESCE(devlog.businessContext, ''), ' ',
            COALESCE(devlog.technicalContext, '')
          ) LIKE :keyQuery THEN 0.5
          ELSE 0.1
        END`,
        'relevance_score',
      )
      .where(
        `CONCAT(
          COALESCE(devlog.title, ''), ' ',
          COALESCE(devlog.description, ''), ' ',
          COALESCE(devlog.businessContext, ''), ' ',
          COALESCE(devlog.technicalContext, '')
        ) LIKE :keyQuery`,
      )
      .setParameter('exactQuery', `%${query}%`)
      .setParameter('keyQuery', `%${query}%`);
  }

  /**
   * Apply standard search filters to query builder
   */
  private async applySearchFilters(
    queryBuilder: SelectQueryBuilder<DevlogEntryEntity>,
    filter: DevlogFilter,
  ): Promise<void> {
    // Apply project filter
    if (filter.projectId !== undefined) {
      queryBuilder.andWhere('devlog.projectId = :projectId', {
        projectId: filter.projectId,
      });
    }

    // Apply status filter
    if (filter.status && filter.status.length > 0) {
      queryBuilder.andWhere('devlog.status IN (:...statuses)', { statuses: filter.status });
    }

    // Apply type filter
    if (filter.type && filter.type.length > 0) {
      queryBuilder.andWhere('devlog.type IN (:...types)', { types: filter.type });
    }

    // Apply priority filter
    if (filter.priority && filter.priority.length > 0) {
      queryBuilder.andWhere('devlog.priority IN (:...priorities)', {
        priorities: filter.priority,
      });
    }

    // Apply assignee filter
    if (filter.assignee !== undefined) {
      if (filter.assignee === null) {
        queryBuilder.andWhere('devlog.assignee IS NULL');
      } else {
        queryBuilder.andWhere('devlog.assignee = :assignee', { assignee: filter.assignee });
      }
    }

    // Apply archived filter
    if (filter.archived !== undefined) {
      queryBuilder.andWhere('devlog.archived = :archived', { archived: filter.archived });
    }

    // Apply date range filters
    if (filter.fromDate) {
      queryBuilder.andWhere('devlog.createdAt >= :fromDate', { fromDate: filter.fromDate });
    }

    if (filter.toDate) {
      queryBuilder.andWhere('devlog.createdAt <= :toDate', { toDate: filter.toDate });
    }
  }

  /**
   * Extract which fields matched the search query
   */
  private extractMatchedFields(entry: DevlogEntry, query: string): string[] {
    const matchedFields: string[] = [];
    const lowerQuery = query.toLowerCase();

    if (entry.title.toLowerCase().includes(lowerQuery)) {
      matchedFields.push('title');
    }

    if (entry.description.toLowerCase().includes(lowerQuery)) {
      matchedFields.push('description');
    }

    if (entry.businessContext && entry.businessContext.toLowerCase().includes(lowerQuery)) {
      matchedFields.push('businessContext');
    }

    if (entry.technicalContext && entry.technicalContext.toLowerCase().includes(lowerQuery)) {
      matchedFields.push('technicalContext');
    }

    if (entry.key && entry.key.toLowerCase().includes(lowerQuery)) {
      matchedFields.push('key');
    }

    if (entry.type.toLowerCase().includes(lowerQuery)) {
      matchedFields.push('type');
    }

    if (entry.priority.toLowerCase().includes(lowerQuery)) {
      matchedFields.push('priority');
    }

    if (entry.status.toLowerCase().includes(lowerQuery)) {
      matchedFields.push('status');
    }

    return matchedFields;
  }

  /**
   * Generate highlighted text excerpts for matched fields
   */
  private generateHighlights(entry: DevlogEntry, query: string): Record<string, string> {
    const highlights: Record<string, string> = {};
    const highlightText = (text: string, maxLength = 200): string => {
      if (!text) return text;
      const regex = new RegExp(`(${query})`, 'gi');
      let highlighted = text.replace(regex, '<mark>$1</mark>');

      if (highlighted.length > maxLength) {
        // Find the position of the first highlight
        const markIndex = highlighted.indexOf('<mark>');
        if (markIndex > -1) {
          // Extract around the highlight
          const start = Math.max(0, markIndex - 50);
          const end = Math.min(highlighted.length, markIndex + maxLength - 50);
          highlighted = highlighted.substring(start, end);
          if (start > 0) highlighted = '...' + highlighted;
          if (end < text.length) highlighted = highlighted + '...';
        } else {
          highlighted = highlighted.substring(0, maxLength) + '...';
        }
      }

      return highlighted;
    };

    const lowerQuery = query.toLowerCase();

    if (entry.title.toLowerCase().includes(lowerQuery)) {
      highlights.title = highlightText(entry.title, 100);
    }

    if (entry.description.toLowerCase().includes(lowerQuery)) {
      highlights.description = highlightText(entry.description, 200);
    }

    if (entry.businessContext && entry.businessContext.toLowerCase().includes(lowerQuery)) {
      highlights.businessContext = highlightText(entry.businessContext, 150);
    }

    if (entry.technicalContext && entry.technicalContext.toLowerCase().includes(lowerQuery)) {
      highlights.technicalContext = highlightText(entry.technicalContext, 150);
    }

    return highlights;
  }

  private prepareListQuery(filter?: DevlogFilter) {
    // Validate filter if provided
    if (filter) {
      const filterValidation = DevlogValidator.validateFilter(filter);
      if (!filterValidation.success) {
        throw new Error(`Invalid filter: ${filterValidation.errors.join(', ')}`);
      }
      // Use validated filter for consistent behavior
      filter = filterValidation.data;
    }

    const projectFilter = this.addProjectFilter(filter);

    // Build TypeORM query based on filter
    const queryBuilder = this.devlogRepository.createQueryBuilder('devlog');

    return { projectFilter, queryBuilder };
  }
}
