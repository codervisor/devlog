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

import { PrismaServiceBase } from './prisma-service-base.js';
import type {
  AgentEvent,
  CreateAgentEventInput,
  EventFilter,
  EventStats,
  TimelineEvent,
  AgentEventType,
  EventSeverity,
  ObservabilityAgentType,
} from '../types/index.js';
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
