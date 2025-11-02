/**
 * Agent Session Service
 *
 * **PRIMARY SERVICE - Core agent observability functionality**
 *
 * Manages AI agent session lifecycle including creation, updates, completion,
 * and querying. Sessions group related events into complete, analyzable workflows,
 * enabling teams to understand agent behavior in context.
 *
 * **Key Responsibilities:**
 * - Session lifecycle: Create, update, and complete agent sessions
 * - Context management: Track session objectives and outcomes
 * - Metrics aggregation: Calculate session-level performance metrics
 * - Analytics: Provide insights into session patterns and success rates
 *
 * **Session Workflow:**
 * 1. Start session: Create with objective and context
 * 2. Log events: Related events reference the session ID
 * 3. End session: Mark complete with outcome and summary
 * 4. Analyze: Query metrics and patterns across sessions
 *
 * @module services/agent-session-service
 * @category Agent Observability
 * @see {@link AgentEventService} for event management
 *
 * @example
 * ```typescript
 * const service = AgentSessionService.getInstance(projectId);
 * await service.initialize();
 *
 * // Start a session
 * const session = await service.create({
 *   agentId: 'github-copilot',
 *   projectId: 1,
 *   objective: 'Implement authentication',
 *   workItemId: 42  // Optional
 * });
 *
 * // End the session
 * await service.end(session.id, {
 *   outcome: 'success',
 *   summary: 'JWT auth implemented with tests'
 * });
 * ```
 */

import { PrismaServiceBase } from '../../services/prisma-service-base.js';
import type {
  AgentSession,
  CreateAgentSessionInput,
  UpdateAgentSessionInput,
  SessionFilter,
  SessionStats,
  SessionOutcome,
  ObservabilityAgentType,
  SessionDailyStats,
  TimeBucketInterval,
} from '../../types/index.js';
import type { PrismaClient, AgentSession as PrismaAgentSession } from '@prisma/client';

/**
 * Service instance with TTL tracking
 */
interface ServiceInstance {
  service: AgentSessionService;
  createdAt: number;
}

/**
 * AgentSessionService - Manages AI agent sessions
 */
export class AgentSessionService extends PrismaServiceBase {
  protected static readonly TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
  private static instances = new Map<string, ServiceInstance>();

  private constructor(private projectId?: number) {
    super();
  }

  /**
   * Get or create service instance with TTL management
   */
  static getInstance(projectId?: number): AgentSessionService {
    const key = projectId ? `project-${projectId}` : 'default';

    // Clean up expired instances
    const now = Date.now();
    for (const [k, instance] of AgentSessionService.instances.entries()) {
      if (now - instance.createdAt > AgentSessionService.TTL_MS) {
        instance.service.dispose();
        AgentSessionService.instances.delete(k);
      }
    }

    // Get or create instance
    let instance = AgentSessionService.instances.get(key);
    if (!instance) {
      instance = {
        service: new AgentSessionService(projectId),
        createdAt: now,
      };
      AgentSessionService.instances.set(key, instance);
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
   * Start a new agent session
   */
  async startSession(input: CreateAgentSessionInput): Promise<AgentSession> {
    await this.initialize();

    if (!this.prisma) {
      throw new Error('Prisma client not initialized - cannot start session in fallback mode');
    }

    const now = new Date();
    const sessionId = this.generateUUID();

    const defaultMetrics = {
      eventsCount: 0,
      filesModified: 0,
      linesAdded: 0,
      linesRemoved: 0,
      tokensUsed: 0,
      commandsExecuted: 0,
      errorsEncountered: 0,
      testsRun: 0,
      testsPassed: 0,
      buildAttempts: 0,
      buildSuccesses: 0,
    };

    const prismaSession = await this.prisma.agentSession.create({
      data: {
        id: sessionId,
        agentId: input.agentId,
        agentVersion: input.agentVersion,
        projectId: input.projectId,
        startTime: now,
        context: input.context as any,
        metrics: defaultMetrics as any,
      },
    });

    return this.toDomainSession(prismaSession);
  }

  /**
   * End an agent session
   */
  async endSession(sessionId: string, outcome: SessionOutcome): Promise<AgentSession> {
    await this.initialize();

    if (!this.prisma) {
      throw new Error('Prisma client not initialized - cannot end session in fallback mode');
    }

    const session = await this.prisma.agentSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const now = new Date();
    const duration = Math.floor((now.getTime() - session.startTime.getTime()) / 1000);

    const updatedSession = await this.prisma.agentSession.update({
      where: { id: sessionId },
      data: {
        endTime: now,
        duration,
        outcome,
      },
    });

    return this.toDomainSession(updatedSession);
  }

  /**
   * Update session data
   */
  async updateSession(sessionId: string, updates: UpdateAgentSessionInput): Promise<AgentSession> {
    await this.initialize();

    if (!this.prisma) {
      throw new Error('Prisma client not initialized - cannot update session in fallback mode');
    }

    const updateData: any = {};

    if (updates.endTime !== undefined) {
      updateData.endTime = updates.endTime;
    }

    if (updates.duration !== undefined) {
      updateData.duration = updates.duration;
    }

    if (updates.context !== undefined) {
      // Merge context
      const session = await this.prisma.agentSession.findUnique({
        where: { id: sessionId },
      });

      if (session) {
        updateData.context = {
          ...(session.context as any),
          ...updates.context,
        };
      }
    }

    if (updates.metrics !== undefined) {
      // Merge metrics
      const session = await this.prisma.agentSession.findUnique({
        where: { id: sessionId },
      });

      if (session) {
        updateData.metrics = {
          ...(session.metrics as any),
          ...updates.metrics,
        };
      }
    }

    if (updates.outcome !== undefined) {
      updateData.outcome = updates.outcome;
    }

    if (updates.qualityScore !== undefined) {
      updateData.qualityScore = updates.qualityScore;
    }

    const updatedSession = await this.prisma.agentSession.update({
      where: { id: sessionId },
      data: updateData,
    });

    return this.toDomainSession(updatedSession);
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<AgentSession | null> {
    await this.initialize();

    if (!this.prisma) {
      return null;
    }

    const session = await this.prisma.agentSession.findUnique({
      where: { id: sessionId },
    });

    return session ? this.toDomainSession(session) : null;
  }

  /**
   * List sessions with filtering
   */
  async listSessions(filter: SessionFilter): Promise<AgentSession[]> {
    await this.initialize();

    if (!this.prisma) {
      return [];
    }

    const where: any = {};

    if (filter.projectId) {
      where.projectId = filter.projectId;
    }

    if (filter.agentId) {
      where.agentId = filter.agentId;
    }

    if (filter.outcome) {
      where.outcome = filter.outcome;
    }

    if (filter.startTimeFrom || filter.startTimeTo) {
      where.startTime = {};
      if (filter.startTimeFrom) {
        where.startTime.gte = filter.startTimeFrom;
      }
      if (filter.startTimeTo) {
        where.startTime.lte = filter.startTimeTo;
      }
    }

    if (filter.minQualityScore !== undefined || filter.maxQualityScore !== undefined) {
      where.qualityScore = {};
      if (filter.minQualityScore !== undefined) {
        where.qualityScore.gte = filter.minQualityScore;
      }
      if (filter.maxQualityScore !== undefined) {
        where.qualityScore.lte = filter.maxQualityScore;
      }
    }

    const sessions = await this.prisma.agentSession.findMany({
      where,
      orderBy: { startTime: 'desc' },
      take: filter.limit || 100,
      skip: filter.offset || 0,
    });

    return sessions.map((s) => this.toDomainSession(s));
  }

  /**
   * Get active (ongoing) sessions
   */
  async getActiveSessions(): Promise<AgentSession[]> {
    await this.initialize();

    if (!this.prisma) {
      return [];
    }

    const sessions = await this.prisma.agentSession.findMany({
      where: { endTime: null },
      orderBy: { startTime: 'desc' },
    });

    return sessions.map((s) => this.toDomainSession(s));
  }

  /**
   * Get session statistics
   */
  async getSessionStats(filter: SessionFilter): Promise<SessionStats> {
    await this.initialize();

    if (!this.prisma) {
      return this.getEmptyStats();
    }

    const where: any = {};

    if (filter.projectId) {
      where.projectId = filter.projectId;
    }

    if (filter.startTimeFrom || filter.startTimeTo) {
      where.startTime = {};
      if (filter.startTimeFrom) {
        where.startTime.gte = filter.startTimeFrom;
      }
      if (filter.startTimeTo) {
        where.startTime.lte = filter.startTimeTo;
      }
    }

    const sessions = await this.prisma.agentSession.findMany({ where });

    const stats: SessionStats = {
      totalSessions: sessions.length,
      sessionsByAgent: this.countByField(sessions, 'agentId'),
      sessionsByOutcome: this.countByField(sessions, 'outcome'),
      averageQualityScore: this.calculateAverageQualityScore(sessions),
      averageDuration: this.calculateAverageDuration(sessions),
      totalTokensUsed: sessions.reduce((sum, s) => {
        const metrics = s.metrics as any;
        return sum + (metrics?.tokensUsed || 0);
      }, 0),
    };

    return stats;
  }

  /**
   * Calculate quality score for a session based on metrics
   */
  async calculateQualityScore(sessionId: string): Promise<number> {
    await this.initialize();

    if (!this.prisma) {
      return 0;
    }

    const session = await this.prisma.agentSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return 0;
    }

    const metrics = session.metrics as any;

    // Simple quality score calculation (can be enhanced)
    let score = 100;

    // Deduct for errors
    if (metrics.errorsEncountered > 0) {
      score -= Math.min(metrics.errorsEncountered * 5, 30);
    }

    // Deduct for failed tests
    if (metrics.testsRun > 0) {
      const testSuccessRate = metrics.testsPassed / metrics.testsRun;
      score -= (1 - testSuccessRate) * 20;
    }

    // Deduct for failed builds
    if (metrics.buildAttempts > 0) {
      const buildSuccessRate = metrics.buildSuccesses / metrics.buildAttempts;
      score -= (1 - buildSuccessRate) * 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get time-bucketed session statistics using TimescaleDB
   *
   * Leverages TimescaleDB's time_bucket function for efficient session aggregations.
   * Groups sessions by time intervals for trend analysis.
   *
   * @param interval - Time bucket interval (e.g., '1 hour', '1 day')
   * @param projectId - Filter by project ID
   * @param agentId - Optional: Filter by agent ID
   * @param startTime - Optional: Start time for the query range
   * @param endTime - Optional: End time for the query range
   * @returns Array of time-bucketed session statistics
   *
   * @example
   * ```typescript
   * // Get daily session counts for last 30 days
   * const stats = await service.getSessionTimeBucketStats('1 day', 1,
   *   undefined,
   *   new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
   *   new Date()
   * );
   * ```
   */
  async getSessionTimeBucketStats(
    interval: TimeBucketInterval,
    projectId: number,
    agentId?: ObservabilityAgentType,
    startTime?: Date,
    endTime?: Date,
  ): Promise<SessionDailyStats[]> {
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
      whereConditions.push(`start_time >= $${paramIndex++}`);
      whereParams.push(startTime);
    }

    if (endTime) {
      whereConditions.push(`start_time <= $${paramIndex++}`);
      whereParams.push(endTime);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Execute time_bucket query
    const query = `
      SELECT 
        time_bucket($${paramIndex}, start_time) AS bucket,
        project_id,
        agent_id,
        COUNT(*) as session_count,
        AVG(duration) as avg_duration,
        SUM((metrics->>'tokensUsed')::numeric) as total_tokens,
        AVG(quality_score) as avg_quality_score
      FROM agent_sessions
      ${whereClause}
      GROUP BY bucket, project_id, agent_id
      ORDER BY bucket DESC
    `;

    whereParams.push(`${interval}`);

    const results = await this.prisma.$queryRawUnsafe(query, ...whereParams);

    return (results as any[]).map((row) => ({
      bucket: new Date(row.bucket),
      projectId: Number(row.project_id),
      agentId: row.agent_id,
      sessionCount: Number(row.session_count),
      avgDuration: row.avg_duration ? Number(row.avg_duration) : 0,
      totalTokens: row.total_tokens ? Number(row.total_tokens) : 0,
      avgQualityScore: row.avg_quality_score ? Number(row.avg_quality_score) : undefined,
    }));
  }

  /**
   * Get sessions with efficient time-range queries
   *
   * Uses the composite index (project_id, start_time DESC) for optimal performance.
   * This method is preferred over listSessions for time-range queries.
   *
   * @param projectId - Project identifier
   * @param startTimeFrom - Start of time range
   * @param startTimeTo - End of time range
   * @param limit - Optional: Maximum number of results (default: 100)
   * @returns Array of sessions within the time range
   *
   * @example
   * ```typescript
   * // Get all sessions from last 24 hours
   * const sessions = await service.getSessionsByTimeRange(1,
   *   new Date(Date.now() - 24 * 60 * 60 * 1000),
   *   new Date()
   * );
   * ```
   */
  async getSessionsByTimeRange(
    projectId: number,
    startTimeFrom: Date,
    startTimeTo: Date,
    limit: number = 100,
  ): Promise<AgentSession[]> {
    await this.initialize();

    if (!this.prisma) {
      return [];
    }

    // This query leverages the composite index (project_id, start_time DESC)
    // for optimal performance on time-range queries
    const sessions = await this.prisma.agentSession.findMany({
      where: {
        projectId,
        startTime: {
          gte: startTimeFrom,
          lte: startTimeTo,
        },
      },
      orderBy: { startTime: 'desc' },
      take: limit,
    });

    return sessions.map((s) => this.toDomainSession(s));
  }

  /**
   * Convert Prisma session to domain session
   */
  private toDomainSession(prismaSession: PrismaAgentSession): AgentSession {
    return {
      id: prismaSession.id,
      agentId: prismaSession.agentId as ObservabilityAgentType,
      agentVersion: prismaSession.agentVersion,
      projectId: prismaSession.projectId,
      startTime: prismaSession.startTime,
      endTime: prismaSession.endTime || undefined,
      duration: prismaSession.duration || undefined,
      context: prismaSession.context as any,
      metrics: prismaSession.metrics as any,
      outcome: prismaSession.outcome as SessionOutcome | undefined,
      qualityScore: prismaSession.qualityScore ? Number(prismaSession.qualityScore) : undefined,
    };
  }

  /**
   * Generate a UUID for sessions
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
  private getEmptyStats(): SessionStats {
    return {
      totalSessions: 0,
      sessionsByAgent: {} as Record<ObservabilityAgentType, number>,
      sessionsByOutcome: {} as Record<SessionOutcome, number>,
      averageQualityScore: 0,
      averageDuration: 0,
      totalTokensUsed: 0,
    };
  }

  /**
   * Count sessions by field
   */
  private countByField(sessions: any[], field: string): Record<string, number> {
    return sessions.reduce((acc, session) => {
      const value = session[field];
      if (value) {
        acc[value] = (acc[value] || 0) + 1;
      }
      return acc;
    }, {});
  }

  /**
   * Calculate average quality score from sessions
   */
  private calculateAverageQualityScore(sessions: any[]): number {
    const scores = sessions
      .map((s) => (s.qualityScore ? Number(s.qualityScore) : 0))
      .filter((s) => s > 0);

    if (scores.length === 0) return 0;
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  }

  /**
   * Calculate average duration from sessions
   */
  private calculateAverageDuration(sessions: any[]): number {
    const durations = sessions.map((s) => s.duration || 0).filter((d) => d > 0);

    if (durations.length === 0) return 0;
    return durations.reduce((sum, d) => sum + d, 0) / durations.length;
  }

  /**
   * Dispose resources
   */
  async dispose(): Promise<void> {
    // Clean up resources if needed
    this.initPromise = null;
  }
}
