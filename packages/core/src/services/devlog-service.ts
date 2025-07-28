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
  TimeSeriesRequest,
  TimeSeriesStats,
} from '../types/index.js';
import { DevlogEntryEntity } from '../entities/index.js';
import { createDataSource } from '../utils/typeorm-config.js';

interface DevlogServiceInstance {
  service: DevlogService;
  createdAt: number;
}

export class DevlogService {
  private static instances: Map<number, DevlogServiceInstance> = new Map();
  private static readonly TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
  private database: DataSource;
  private devlogRepository: Repository<DevlogEntryEntity>;

  private constructor(private projectId?: number) {
    this.database = createDataSource();
    this.devlogRepository = this.database.getRepository(DevlogEntryEntity);
  }

  /**
   * Get singleton instance for specific projectId with TTL. If TTL expired, create new instance.
   */
  static getInstance(projectId?: number): DevlogService {
    const instanceKey = projectId || 0; // Use 0 for undefined projectId
    const now = Date.now();
    const existingInstance = DevlogService.instances.get(instanceKey);
    
    if (
      !existingInstance ||
      now - existingInstance.createdAt > DevlogService.TTL_MS
    ) {
      const newService = new DevlogService(projectId);
      DevlogService.instances.set(instanceKey, {
        service: newService,
        createdAt: now
      });
      return newService;
    }
    
    return existingInstance.service;
  }

  async get(id: DevlogId): Promise<DevlogEntry | null> {
    const entity = await this.devlogRepository.findOne({ where: { id } });

    if (!entity) {
      return null;
    }

    return entity.toDevlogEntry();
  }

  async save(entry: DevlogEntry): Promise<void> {
    // Convert to entity and save
    const entity = DevlogEntryEntity.fromDevlogEntry(entry);
    await this.devlogRepository.save(entity);
  }

  async delete(id: DevlogId): Promise<void> {
    await this.devlogRepository.delete({ id });
  }

  async list(filter?: DevlogFilter): Promise<PaginatedResult<DevlogEntry>> {
    const projectFilter = this.addProjectFilter(filter);

    // Build TypeORM query based on filter
    const queryBuilder = this.devlogRepository.createQueryBuilder('devlog');

    return await this.handleList(projectFilter, queryBuilder);
  }

  async search(query: string, filter?: DevlogFilter): Promise<PaginatedResult<DevlogEntry>> {
    const projectFilter = this.addProjectFilter(filter);

    const queryBuilder = this.devlogRepository.createQueryBuilder('devlog');

    // Apply search query
    queryBuilder
      .where('devlog.title LIKE :query', { query: `%${query}%` })
      .orWhere('devlog.description LIKE :query', { query: `%${query}%` })
      .orWhere('devlog.businessContext LIKE :query', { query: `%${query}%` })
      .orWhere('devlog.technicalContext LIKE :query', { query: `%${query}%` });

    return await this.handleList(projectFilter, queryBuilder);
  }

  async getStats(filter?: DevlogFilter): Promise<DevlogStats> {
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
    const result = await this.devlogRepository
      .createQueryBuilder('devlog')
      .select('MAX(devlog.id)', 'maxId')
      .getRawOne();

    return (result?.maxId || 0) + 1;
  }

  private async handleList(
    projectFilter: DevlogFilter,
    queryBuilder: SelectQueryBuilder<DevlogEntryEntity>,
  ): Promise<PaginatedResult<DevlogEntry>> {
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
}
