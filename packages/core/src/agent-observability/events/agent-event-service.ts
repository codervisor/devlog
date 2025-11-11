/**
 * Agent Event Service
 *
 * **PRIMARY SERVICE - Core agent observability functionality**
 *
 * Manages the lifecycle of AI agent events including creation, querying,
 * and aggregation for analytics. This service handles high-volume event
 * ingestion and efficient time-series queries.
 *
 * **Key Responsibilities:**
 * - Event ingestion: Capture and store agent activity events
 * - Query operations: Retrieve events with filtering and pagination
 * - Analytics: Aggregate metrics for performance analysis
 * - Timeline reconstruction: Build complete activity timelines
 *
 * **Performance Characteristics:**
 * - Optimized for write-heavy workloads (event ingestion)
 * - Uses PostgreSQL with TimescaleDB for time-series data
 * - Supports efficient time-range and filter queries
 * - Implements TTL-based instance management for resource efficiency
 *
 * @module services/agent-event-service
 * @category Agent Observability
 * @see {@link AgentSessionService} for session management
 *
 * @example
 * ```typescript
 * const service = AgentEventService.getInstance(projectId);
 * await service.initialize();
 *
 * // Log an event
 * const event = await service.logEvent({
 *   type: 'file_write',
 *   agentId: 'github-copilot',
 *   sessionId: 'session-123',
 *   projectId: 1,
 *   context: { workingDirectory: '/app', filePath: 'src/main.ts' },
 *   data: { content: '...' }
 * });
 *
 * // Query events
 * const events = await service.queryEvents({
 *   sessionId: 'session-123',
 *   eventType: 'file_write'
 * });
 * ```
 */

import { PrismaServiceBase } from '../../services/prisma-service-base.js';
import type {
  AgentEvent,
  CreateAgentEventInput,
  EventFilter,
  EventStats,
  TimelineEvent,
  AgentEventType,
  EventSeverity,
  ObservabilityAgentType,
  TimeBucketQueryParams,
  EventTimeBucketStats,
} from '../../types/index.js';
import type { PrismaClient, AgentEvent as PrismaAgentEvent } from '@prisma/client';

/**
 * Service instance with TTL tracking
 */
interface ServiceInstance {
  service: AgentEventService;
  createdAt: number;
}

/**
 * AgentEventService - Manages AI agent events
 */
export class AgentEventService extends PrismaServiceBase {
  protected static readonly TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
  private static instances = new Map<string, ServiceInstance>();

  private constructor(private projectId?: number) {
    super();
  }

  /**
   * Get or create service instance with TTL management
   */
  static getInstance(projectId?: number): AgentEventService {
    const key = projectId ? `project-${projectId}` : 'default';

    // Clean up expired instances
    const now = Date.now();
    for (const [k, instance] of AgentEventService.instances.entries()) {
      if (now - instance.createdAt > AgentEventService.TTL_MS) {
        instance.service.dispose();
        AgentEventService.instances.delete(k);
      }
    }

    // Get or create instance
    let instance = AgentEventService.instances.get(key);
    if (!instance) {
      instance = {
        service: new AgentEventService(projectId),
        createdAt: now,
      };
      AgentEventService.instances.set(key, instance);
    }

    return instance.service;
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      await this.prismaImportPromise;
      // Additional initialization if needed
    })();

    return this.initPromise;
  }

  /**
   * Collect a single agent event
   */
  async collectEvent(input: CreateAgentEventInput): Promise<AgentEvent> {
    await this.initialize();

    if (!this.prisma) {
      throw new Error('Prisma client not initialized - cannot collect event in fallback mode');
    }

    const now = new Date();
    const eventId = this.generateUUID();

    const prismaEvent = await this.prisma.agentEvent.create({
      data: {
        id: eventId,
        timestamp: now,
        eventType: input.type,
        agentId: input.agentId,
        agentVersion: input.agentVersion,
        sessionId: input.sessionId,
        projectId: input.projectId,
        context: input.context as any,
        data: input.data as any,
        metrics: input.metrics as any,
        parentEventId: input.parentEventId,
        relatedEventIds: input.relatedEventIds || [],
        tags: input.tags || [],
        severity: input.severity,
      },
    });

    return this.toDomainEvent(prismaEvent);
  }

  /**
   * Collect multiple events in a batch
   */
  async collectEventBatch(inputs: CreateAgentEventInput[]): Promise<AgentEvent[]> {
    await this.initialize();

    if (!this.prisma) {
      throw new Error('Prisma client not initialized - cannot collect events in fallback mode');
    }

    const now = new Date();
    const events = inputs.map((input) => ({
      id: this.generateUUID(),
      timestamp: now,
      eventType: input.type,
      agentId: input.agentId,
      agentVersion: input.agentVersion,
      sessionId: input.sessionId,
      projectId: input.projectId,
      context: input.context as any,
      data: input.data as any,
      metrics: input.metrics as any,
      parentEventId: input.parentEventId,
      relatedEventIds: input.relatedEventIds || [],
      tags: input.tags || [],
      severity: input.severity,
    }));

    const result = await this.prisma.agentEvent.createMany({
      data: events,
    });

    // Fetch created events to return
    const eventIds = events.map((e) => e.id);
    const createdEvents = await this.prisma.agentEvent.findMany({
      where: { id: { in: eventIds } },
    });

    return createdEvents.map((e) => this.toDomainEvent(e));
  }

  /**
   * Get events with filtering
   */
  async getEvents(filter: EventFilter): Promise<AgentEvent[]> {
    await this.initialize();

    if (!this.prisma) {
      return [];
    }

    const where: any = {};

    if (filter.sessionId) {
      where.sessionId = filter.sessionId;
    }

    if (filter.projectId) {
      where.projectId = filter.projectId;
    }

    if (filter.agentId) {
      where.agentId = filter.agentId;
    }

    if (filter.eventType) {
      where.eventType = filter.eventType;
    }

    if (filter.severity) {
      where.severity = filter.severity;
    }

    if (filter.startTime || filter.endTime) {
      where.timestamp = {};
      if (filter.startTime) {
        where.timestamp.gte = filter.startTime;
      }
      if (filter.endTime) {
        where.timestamp.lte = filter.endTime;
      }
    }

    if (filter.tags && filter.tags.length > 0) {
      where.tags = { hasSome: filter.tags };
    }

    const events = await this.prisma.agentEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filter.limit || 100,
      skip: filter.offset || 0,
    });

    return events.map((e) => this.toDomainEvent(e));
  }

  /**
   * Get event by ID
   */
  async getEventById(id: string): Promise<AgentEvent | null> {
    await this.initialize();

    if (!this.prisma) {
      return null;
    }

    const event = await this.prisma.agentEvent.findUnique({
      where: { id },
    });

    return event ? this.toDomainEvent(event) : null;
  }

  /**
   * Get events for a specific session
   */
  async getEventsBySession(sessionId: string): Promise<AgentEvent[]> {
    return this.getEvents({ sessionId });
  }

  /**
   * Get event statistics
   */
  async getEventStats(filter: EventFilter): Promise<EventStats> {
    await this.initialize();

    if (!this.prisma) {
      return this.getEmptyStats();
    }

    const where: any = {};

    if (filter.sessionId) {
      where.sessionId = filter.sessionId;
    }

    if (filter.projectId) {
      where.projectId = filter.projectId;
    }

    if (filter.startTime || filter.endTime) {
      where.timestamp = {};
      if (filter.startTime) {
        where.timestamp.gte = filter.startTime;
      }
      if (filter.endTime) {
        where.timestamp.lte = filter.endTime;
      }
    }

    const events = await this.prisma.agentEvent.findMany({ where });

    const stats: EventStats = {
      totalEvents: events.length,
      eventsByType: this.countByField(events, 'eventType'),
      eventsBySeverity: this.countByField(events, 'severity'),
      totalTokens: events.reduce((sum, e) => {
        const metrics = e.metrics as any;
        return sum + (metrics?.tokenCount || 0);
      }, 0),
      averageDuration: this.calculateAverageDuration(events),
    };

    return stats;
  }

  /**
   * Get timeline events for visualization
   */
  async getEventTimeline(sessionId: string): Promise<TimelineEvent[]> {
    const events = await this.getEventsBySession(sessionId);

    return events.map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      type: e.type,
      description: this.getEventDescription(e),
      severity: e.severity,
      data: e.data,
    }));
  }

  /**
   * Get time-bucketed event statistics using TimescaleDB
   *
   * Leverages TimescaleDB's time_bucket function for efficient time-series aggregations.
   * This method is optimized for dashboard queries and analytics.
   *
   * @param params - Query parameters including interval and filters
   * @returns Array of time-bucketed statistics
   *
   * @example
   * ```typescript
   * // Get hourly event counts for last 24 hours
   * const stats = await service.getTimeBucketStats({
   *   interval: '1 hour',
   *   projectId: 1,
   *   startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
   *   endTime: new Date()
   * });
   * ```
   */
  async getTimeBucketStats(params: TimeBucketQueryParams): Promise<EventTimeBucketStats[]> {
    await this.initialize();

    if (!this.prisma) {
      return [];
    }

    const { interval, projectId, agentId, eventType, startTime, endTime } = params;

    // Build WHERE clause with dynamic parameter indexing
    // Parameter order: projectId?, agentId?, eventType?, startTime?, endTime?, interval (last)
    const whereConditions: string[] = [];
    const whereParams: any[] = [];
    let paramIndex = 1;

    if (projectId !== undefined) {
      whereConditions.push(`project_id = $${paramIndex++}`);
      whereParams.push(projectId);
    }

    if (agentId) {
      whereConditions.push(`agent_id = $${paramIndex++}`);
      whereParams.push(agentId);
    }

    if (eventType) {
      whereConditions.push(`event_type = $${paramIndex++}`);
      whereParams.push(eventType);
    }

    if (startTime) {
      whereConditions.push(`timestamp >= $${paramIndex++}`);
      whereParams.push(startTime);
    }

    if (endTime) {
      whereConditions.push(`timestamp <= $${paramIndex++}`);
      whereParams.push(endTime);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Build SELECT fields and GROUP BY based on whether eventType is included
    const eventTypeField = eventType ? 'event_type,' : '';
    const eventTypeGroupBy = eventType ? ', event_type' : '';

    // Execute time_bucket query
    // Parameter order is maintained by whereParams array, final param is interval
    const query = `
      SELECT 
        time_bucket($${paramIndex}, timestamp) AS bucket,
        project_id,
        agent_id,
        ${eventTypeField}
        COUNT(*) as event_count,
        AVG((metrics->>'duration')::numeric) as avg_duration,
        SUM((metrics->>'tokenCount')::numeric) as total_tokens,
        AVG((metrics->>'promptTokens')::numeric) as avg_prompt_tokens,
        AVG((metrics->>'responseTokens')::numeric) as avg_response_tokens
      FROM agent_events
      ${whereClause}
      GROUP BY bucket, project_id, agent_id${eventTypeGroupBy}
      ORDER BY bucket DESC
    `;

    whereParams.push(`${interval}`);

    const results = await this.prisma.$queryRawUnsafe(query, ...whereParams);

    return (results as any[]).map((row) => ({
      bucket: new Date(row.bucket),
      projectId: Number(row.project_id),
      agentId: row.agent_id,
      eventType: row.event_type,
      eventCount: Number(row.event_count),
      avgDuration: row.avg_duration ? Number(row.avg_duration) : undefined,
      totalTokens: row.total_tokens ? Number(row.total_tokens) : undefined,
      avgPromptTokens: row.avg_prompt_tokens ? Number(row.avg_prompt_tokens) : undefined,
      avgResponseTokens: row.avg_response_tokens ? Number(row.avg_response_tokens) : undefined,
    }));
  }

  /**
   * Get hourly event statistics from continuous aggregates
   *
   * Queries the pre-computed agent_events_hourly materialized view for fast dashboard queries.
   * This is much faster than computing aggregations on-the-fly.
   *
   * @param projectId - Filter by project ID
   * @param agentId - Optional: Filter by agent ID
   * @param startTime - Optional: Start time for the query range
   * @param endTime - Optional: End time for the query range
   * @returns Array of hourly statistics
   *
   * @example
   * ```typescript
   * // Get last 7 days of hourly stats
   * const stats = await service.getHourlyStats(1, 'github-copilot',
   *   new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
   * ```
   */
  async getHourlyStats(
    projectId: number,
    agentId?: ObservabilityAgentType,
    startTime?: Date,
    endTime?: Date,
  ): Promise<EventTimeBucketStats[]> {
    await this.initialize();

    if (!this.prisma) {
      return [];
    }

    // Build WHERE clause
    const whereConditions: string[] = ['project_id = $1'];
    const whereParams: any[] = [projectId];
    let paramIndex = 2;

    if (agentId) {
      whereConditions.push(`agent_id = $${paramIndex++}`);
      whereParams.push(agentId);
    }

    if (startTime) {
      whereConditions.push(`bucket >= $${paramIndex++}`);
      whereParams.push(startTime);
    }

    if (endTime) {
      whereConditions.push(`bucket <= $${paramIndex++}`);
      whereParams.push(endTime);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Query continuous aggregate
    const query = `
      SELECT 
        bucket,
        project_id,
        agent_id,
        event_type,
        event_count,
        avg_duration
      FROM agent_events_hourly
      ${whereClause}
      ORDER BY bucket DESC
    `;

    try {
      const results = await this.prisma.$queryRawUnsafe(query, ...whereParams);

      return (results as any[]).map((row) => ({
        bucket: new Date(row.bucket),
        projectId: Number(row.project_id),
        agentId: row.agent_id,
        eventType: row.event_type,
        eventCount: Number(row.event_count),
        avgDuration: row.avg_duration ? Number(row.avg_duration) : undefined,
      }));
    } catch (error) {
      // Continuous aggregate might not exist yet, fall back to regular query
      // This happens when TimescaleDB is not enabled or aggregates haven't been created
      if (error instanceof Error) {
        console.warn(
          `[AgentEventService] Could not query agent_events_hourly: ${error.message}. Falling back to time_bucket query.`,
        );
      }
      return this.getTimeBucketStats({
        interval: '1 hour',
        projectId,
        agentId,
        startTime,
        endTime,
      });
    }
  }

  /**
   * Get daily event statistics from continuous aggregates
   *
   * Queries the pre-computed agent_events_daily materialized view for long-term analytics.
   * Ideal for displaying trends over weeks or months.
   *
   * @param projectId - Filter by project ID
   * @param agentId - Optional: Filter by agent ID
   * @param startDate - Optional: Start date for the query range
   * @param endDate - Optional: End date for the query range
   * @returns Array of daily statistics
   *
   * @example
   * ```typescript
   * // Get last 30 days of daily stats
   * const stats = await service.getDailyStats(1, undefined,
   *   new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
   * ```
   */
  async getDailyStats(
    projectId: number,
    agentId?: ObservabilityAgentType,
    startDate?: Date,
    endDate?: Date,
  ): Promise<EventTimeBucketStats[]> {
    await this.initialize();

    if (!this.prisma) {
      return [];
    }

    // Build WHERE clause
    const whereConditions: string[] = ['project_id = $1'];
    const whereParams: any[] = [projectId];
    let paramIndex = 2;

    if (agentId) {
      whereConditions.push(`agent_id = $${paramIndex++}`);
      whereParams.push(agentId);
    }

    if (startDate) {
      whereConditions.push(`bucket >= $${paramIndex++}`);
      whereParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`bucket <= $${paramIndex++}`);
      whereParams.push(endDate);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Query continuous aggregate
    const query = `
      SELECT 
        bucket,
        project_id,
        agent_id,
        event_count,
        session_count,
        avg_prompt_tokens,
        avg_response_tokens,
        total_duration
      FROM agent_events_daily
      ${whereClause}
      ORDER BY bucket DESC
    `;

    try {
      const results = await this.prisma.$queryRawUnsafe(query, ...whereParams);

      return (results as any[]).map((row) => ({
        bucket: new Date(row.bucket),
        projectId: Number(row.project_id),
        agentId: row.agent_id,
        eventCount: Number(row.event_count),
        avgPromptTokens: row.avg_prompt_tokens ? Number(row.avg_prompt_tokens) : undefined,
        avgResponseTokens: row.avg_response_tokens ? Number(row.avg_response_tokens) : undefined,
        totalDuration: row.total_duration ? Number(row.total_duration) : undefined,
      }));
    } catch (error) {
      // Continuous aggregate might not exist yet, fall back to regular query
      // This happens when TimescaleDB is not enabled or aggregates haven't been created
      if (error instanceof Error) {
        console.warn(
          `[AgentEventService] Could not query agent_events_daily: ${error.message}. Falling back to time_bucket query.`,
        );
      }
      return this.getTimeBucketStats({
        interval: '1 day',
        projectId,
        agentId,
        startTime: startDate,
        endTime: endDate,
      });
    }
  }

  /**
   * Convert Prisma event to domain event
   */
  private toDomainEvent(prismaEvent: PrismaAgentEvent): AgentEvent {
    return {
      id: prismaEvent.id,
      timestamp: prismaEvent.timestamp,
      type: prismaEvent.eventType as AgentEventType,
      agentId: prismaEvent.agentId as ObservabilityAgentType,
      agentVersion: prismaEvent.agentVersion,
      sessionId: prismaEvent.sessionId,
      projectId: prismaEvent.projectId,
      context: prismaEvent.context as any,
      data: prismaEvent.data as any,
      metrics: prismaEvent.metrics as any,
      parentEventId: prismaEvent.parentEventId || undefined,
      relatedEventIds: prismaEvent.relatedEventIds,
      tags: prismaEvent.tags,
      severity: prismaEvent.severity as EventSeverity | undefined,
    };
  }

  /**
   * Generate a UUID for events
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Get empty stats when Prisma is not available
   */
  private getEmptyStats(): EventStats {
    return {
      totalEvents: 0,
      eventsByType: {} as Record<AgentEventType, number>,
      eventsBySeverity: {} as Record<EventSeverity, number>,
      totalTokens: 0,
      averageDuration: 0,
    };
  }

  /**
   * Count events by field
   */
  private countByField(events: any[], field: string): Record<string, number> {
    return events.reduce((acc, event) => {
      const value = event[field];
      if (value) {
        acc[value] = (acc[value] || 0) + 1;
      }
      return acc;
    }, {});
  }

  /**
   * Calculate average duration from events
   */
  private calculateAverageDuration(events: any[]): number {
    const durations = events
      .map((e) => {
        const metrics = e.metrics as any;
        return metrics?.duration || 0;
      })
      .filter((d) => d > 0);

    if (durations.length === 0) return 0;
    return durations.reduce((sum, d) => sum + d, 0) / durations.length;
  }

  /**
   * Get human-readable description for an event
   */
  private getEventDescription(event: AgentEvent): string {
    switch (event.type) {
      case 'session_start':
        return 'Session started';
      case 'session_end':
        return 'Session ended';
      case 'file_read':
        return `Read file: ${event.context.filePath}`;
      case 'file_write':
        return `Wrote file: ${event.context.filePath}`;
      case 'file_create':
        return `Created file: ${event.context.filePath}`;
      case 'file_delete':
        return `Deleted file: ${event.context.filePath}`;
      case 'llm_request':
        return 'LLM request sent';
      case 'llm_response':
        return 'LLM response received';
      case 'error_encountered':
        return `Error: ${event.data.message || 'Unknown error'}`;
      case 'command_execute':
        return `Executed: ${event.data.command}`;
      default:
        return event.type;
    }
  }

  /**
   * Dispose resources
   */
  async dispose(): Promise<void> {
    // Clean up resources if needed
    this.initPromise = null;
  }
}
