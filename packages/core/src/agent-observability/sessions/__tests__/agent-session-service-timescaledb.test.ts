/**
 * Tests for TimescaleDB-optimized query methods in AgentSessionService
 *
 * These tests verify the Phase 3 implementation of TimescaleDB features:
 * - time_bucket aggregations for sessions
 * - optimized time-range queries using composite indexes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentSessionService } from '../agent-session-service.js';
import type { SessionDailyStats } from '../../../types/index.js';

describe('AgentSessionService - TimescaleDB Optimizations', () => {
  let service: AgentSessionService;

  beforeEach(() => {
    service = AgentSessionService.getInstance(1);
  });

  afterEach(async () => {
    await service.dispose();
  });

  describe('getSessionTimeBucketStats', () => {
    it('should build correct SQL query for time_bucket aggregation', async () => {
      await service.initialize();

      const mockQueryRaw = vi.fn().mockResolvedValue([
        {
          bucket: new Date('2025-11-01T00:00:00Z'),
          project_id: 1,
          agent_id: 'github-copilot',
          session_count: BigInt(25),
          avg_duration: 3600.5,
          total_tokens: BigInt(50000),
          avg_quality_score: 85.5,
        },
      ]);

      if (service['prisma']) {
        service['prisma'].$queryRawUnsafe = mockQueryRaw;
      }

      const results = await service.getSessionTimeBucketStats(
        '1 day',
        1,
        'github-copilot',
        new Date('2025-11-01T00:00:00Z'),
        new Date('2025-11-30T00:00:00Z'),
      );

      // Verify query was called
      expect(mockQueryRaw).toHaveBeenCalled();

      // Verify query contains time_bucket function
      const query = mockQueryRaw.mock.calls[0][0] as string;
      expect(query).toContain('time_bucket');
      expect(query).toContain('agent_sessions');
      expect(query).toContain('start_time');
      expect(query).toContain('GROUP BY bucket');

      // Verify results are properly mapped
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        bucket: expect.any(Date),
        projectId: 1,
        agentId: 'github-copilot',
        sessionCount: 25,
        avgDuration: 3600.5,
        totalTokens: 50000,
        avgQualityScore: 85.5,
      });
    });

    it('should handle different time intervals', async () => {
      await service.initialize();

      const mockQueryRaw = vi.fn().mockResolvedValue([]);
      if (service['prisma']) {
        service['prisma'].$queryRawUnsafe = mockQueryRaw;
      }

      // Test with different intervals
      const intervals: Array<'1 hour' | '1 day' | '1 week'> = ['1 hour', '1 day', '1 week'];

      for (const interval of intervals) {
        await service.getSessionTimeBucketStats(interval, 1);

        const params = mockQueryRaw.mock.calls[mockQueryRaw.mock.calls.length - 1];
        expect(params[params.length - 1]).toBe(interval);
      }
    });

    it('should build WHERE clause with all filters', async () => {
      await service.initialize();

      const mockQueryRaw = vi.fn().mockResolvedValue([]);
      if (service['prisma']) {
        service['prisma'].$queryRawUnsafe = mockQueryRaw;
      }

      const startTime = new Date('2025-11-01T00:00:00Z');
      const endTime = new Date('2025-11-30T00:00:00Z');

      await service.getSessionTimeBucketStats('1 day', 1, 'github-copilot', startTime, endTime);

      // Verify WHERE clause contains all conditions
      const query = mockQueryRaw.mock.calls[0][0] as string;
      expect(query).toContain('WHERE');
      expect(query).toContain('project_id = $1');
      expect(query).toContain('agent_id = $2');
      expect(query).toContain('start_time >= $3');
      expect(query).toContain('start_time <= $4');
    });

    it('should return empty array when prisma is not initialized', async () => {
      const newService = AgentSessionService.getInstance(999);

      const results = await newService.getSessionTimeBucketStats('1 day', 1);

      expect(results).toEqual([]);
      await newService.dispose();
    });
  });

  describe('getSessionsByTimeRange', () => {
    it('should use composite index for efficient time-range queries', async () => {
      await service.initialize();

      const mockFindMany = vi.fn().mockResolvedValue([
        {
          id: 'session-1',
          agent_id: 'github-copilot',
          agent_version: '1.0.0',
          project_id: 1,
          start_time: new Date('2025-11-01T12:00:00Z'),
          end_time: new Date('2025-11-01T13:00:00Z'),
          duration: 3600,
          context: {},
          metrics: {},
          outcome: 'success',
          quality_score: 85,
        },
      ]);

      if (service['prisma']) {
        service['prisma'].agentSession = {
          findMany: mockFindMany,
        } as any;
      }

      const startTime = new Date('2025-11-01T00:00:00Z');
      const endTime = new Date('2025-11-02T00:00:00Z');

      const results = await service.getSessionsByTimeRange(1, startTime, endTime, 50);

      // Verify findMany was called with correct parameters
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          projectId: 1,
          startTime: {
            gte: startTime,
            lte: endTime,
          },
        },
        orderBy: { startTime: 'desc' },
        take: 50,
      });

      // Verify results
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('session-1');
    });

    it('should use default limit of 100 when not specified', async () => {
      await service.initialize();

      const mockFindMany = vi.fn().mockResolvedValue([]);
      if (service['prisma']) {
        service['prisma'].agentSession = {
          findMany: mockFindMany,
        } as any;
      }

      await service.getSessionsByTimeRange(
        1,
        new Date('2025-11-01T00:00:00Z'),
        new Date('2025-11-02T00:00:00Z'),
      );

      const call = mockFindMany.mock.calls[0][0];
      expect(call.take).toBe(100);
    });

    it('should return empty array when prisma is not initialized', async () => {
      const newService = AgentSessionService.getInstance(999);

      const results = await newService.getSessionsByTimeRange(1, new Date(), new Date());

      expect(results).toEqual([]);
      await newService.dispose();
    });

    it('should properly map prisma sessions to domain sessions', async () => {
      await service.initialize();

      const mockFindMany = vi.fn().mockResolvedValue([
        {
          id: 'session-1',
          agentId: 'github-copilot',
          agentVersion: '1.0.0',
          projectId: 1,
          startTime: new Date('2025-11-01T12:00:00Z'),
          endTime: new Date('2025-11-01T13:00:00Z'),
          duration: 3600,
          context: { branch: 'main', triggeredBy: 'user' },
          metrics: { eventsCount: 50, tokensUsed: 1000 },
          outcome: 'success',
          qualityScore: 85.5,
        },
      ]);

      if (service['prisma']) {
        service['prisma'].agentSession = {
          findMany: mockFindMany,
        } as any;
      }

      const results = await service.getSessionsByTimeRange(
        1,
        new Date('2025-11-01T00:00:00Z'),
        new Date('2025-11-02T00:00:00Z'),
      );

      expect(results[0]).toMatchObject({
        id: 'session-1',
        agentId: 'github-copilot',
        agentVersion: '1.0.0',
        projectId: 1,
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        duration: 3600,
        outcome: 'success',
        qualityScore: 85.5,
      });
    });
  });

  describe('performance optimization', () => {
    it('should leverage composite index (project_id, start_time DESC)', async () => {
      await service.initialize();

      const mockFindMany = vi.fn().mockResolvedValue([]);
      if (service['prisma']) {
        service['prisma'].agentSession = {
          findMany: mockFindMany,
        } as any;
      }

      await service.getSessionsByTimeRange(
        1,
        new Date('2025-11-01T00:00:00Z'),
        new Date('2025-11-02T00:00:00Z'),
      );

      // Verify query structure matches index
      const queryParams = mockFindMany.mock.calls[0][0];
      expect(queryParams.where.projectId).toBeDefined();
      expect(queryParams.where.startTime).toBeDefined();
      expect(queryParams.orderBy).toEqual({ startTime: 'desc' });
    });
  });

  describe('result type conversion', () => {
    it('should properly convert BigInt to Number in session stats', async () => {
      await service.initialize();

      const mockQueryRaw = vi.fn().mockResolvedValue([
        {
          bucket: new Date('2025-11-01T00:00:00Z'),
          project_id: 1,
          agent_id: 'test-agent',
          session_count: BigInt(999999),
          avg_duration: 1500.5,
          total_tokens: BigInt(0), // Test zero
          avg_quality_score: null, // Test null
        },
      ]);

      if (service['prisma']) {
        service['prisma'].$queryRawUnsafe = mockQueryRaw;
      }

      const results = await service.getSessionTimeBucketStats('1 day', 1);

      expect(results[0].sessionCount).toBe(999999);
      expect(results[0].avgDuration).toBe(1500.5);
      expect(results[0].totalTokens).toBe(0);
      expect(results[0].avgQualityScore).toBeUndefined();
    });
  });
});
