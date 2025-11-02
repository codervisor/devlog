/**
 * Tests for TimescaleDB-optimized query methods in AgentEventService
 *
 * These tests verify the Phase 3 implementation of TimescaleDB features:
 * - time_bucket aggregations
 * - continuous aggregate queries
 * - optimized time-range queries
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentEventService } from '../agent-event-service.js';
import type { TimeBucketQueryParams, EventTimeBucketStats } from '../../../types/index.js';

describe('AgentEventService - TimescaleDB Optimizations', () => {
  let service: AgentEventService;

  beforeEach(() => {
    service = AgentEventService.getInstance(1);
  });

  afterEach(async () => {
    await service.dispose();
  });

  describe('getTimeBucketStats', () => {
    it('should build correct SQL query for time_bucket aggregation', async () => {
      await service.initialize();

      const params: TimeBucketQueryParams = {
        interval: '1 hour',
        projectId: 1,
        agentId: 'github-copilot',
        startTime: new Date('2025-11-01T00:00:00Z'),
        endTime: new Date('2025-11-02T00:00:00Z'),
      };

      // Mock the prisma $queryRawUnsafe to verify the query
      const mockQueryRaw = vi.fn().mockResolvedValue([
        {
          bucket: new Date('2025-11-01T12:00:00Z'),
          project_id: 1,
          agent_id: 'github-copilot',
          event_count: BigInt(150),
          avg_duration: 1250.5,
          total_tokens: BigInt(15000),
          avg_prompt_tokens: 800.2,
          avg_response_tokens: 400.3,
        },
      ]);

      // Replace the prisma client's $queryRawUnsafe method
      if (service['prisma']) {
        service['prisma'].$queryRawUnsafe = mockQueryRaw;
      }

      const results = await service.getTimeBucketStats(params);

      // Verify query was called
      expect(mockQueryRaw).toHaveBeenCalled();

      // Verify query contains time_bucket function
      const query = mockQueryRaw.mock.calls[0][0] as string;
      expect(query).toContain('time_bucket');
      expect(query).toContain('agent_events');
      expect(query).toContain('GROUP BY bucket');

      // Verify results are properly mapped
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        bucket: expect.any(Date),
        projectId: 1,
        agentId: 'github-copilot',
        eventCount: 150,
        avgDuration: 1250.5,
        totalTokens: 15000,
      });
    });

    it('should handle missing optional parameters', async () => {
      await service.initialize();

      const params: TimeBucketQueryParams = {
        interval: '1 day',
      };

      const mockQueryRaw = vi.fn().mockResolvedValue([]);
      if (service['prisma']) {
        service['prisma'].$queryRawUnsafe = mockQueryRaw;
      }

      await service.getTimeBucketStats(params);

      // Verify query doesn't include WHERE clause when no filters
      const query = mockQueryRaw.mock.calls[0][0] as string;
      expect(query).not.toContain('WHERE');
    });

    it('should return empty array when prisma is not initialized', async () => {
      const newService = AgentEventService.getInstance(999);
      // Don't initialize - prisma will be null

      const results = await newService.getTimeBucketStats({
        interval: '1 hour',
        projectId: 1,
      });

      expect(results).toEqual([]);
      await newService.dispose();
    });
  });

  describe('getHourlyStats', () => {
    it('should query continuous aggregate for hourly stats', async () => {
      await service.initialize();

      const mockQueryRaw = vi.fn().mockResolvedValue([
        {
          bucket: new Date('2025-11-01T12:00:00Z'),
          project_id: 1,
          agent_id: 'github-copilot',
          event_type: 'file_write',
          event_count: BigInt(50),
          avg_duration: 1500.5,
        },
      ]);

      if (service['prisma']) {
        service['prisma'].$queryRawUnsafe = mockQueryRaw;
      }

      const results = await service.getHourlyStats(
        1,
        'github-copilot',
        new Date('2025-11-01T00:00:00Z'),
        new Date('2025-11-02T00:00:00Z'),
      );

      // Verify query targets continuous aggregate
      const query = mockQueryRaw.mock.calls[0][0] as string;
      expect(query).toContain('agent_events_hourly');
      expect(query).toContain('WHERE');
      expect(query).toContain('ORDER BY bucket DESC');

      // Verify results
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        bucket: expect.any(Date),
        projectId: 1,
        agentId: 'github-copilot',
        eventCount: 50,
      });
    });

    it('should fallback to getTimeBucketStats when continuous aggregate fails', async () => {
      await service.initialize();

      // Mock continuous aggregate query to fail
      const mockQueryRaw = vi
        .fn()
        .mockRejectedValue(new Error('relation "agent_events_hourly" does not exist'));

      if (service['prisma']) {
        service['prisma'].$queryRawUnsafe = mockQueryRaw;
      }

      // Spy on getTimeBucketStats to verify fallback
      const getTimeBucketStatsSpy = vi.spyOn(service, 'getTimeBucketStats').mockResolvedValue([]);

      await service.getHourlyStats(1);

      // Verify fallback was called
      expect(getTimeBucketStatsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          interval: '1 hour',
          projectId: 1,
        }),
      );
    });
  });

  describe('getDailyStats', () => {
    it('should query continuous aggregate for daily stats', async () => {
      await service.initialize();

      const mockQueryRaw = vi.fn().mockResolvedValue([
        {
          bucket: new Date('2025-11-01T00:00:00Z'),
          project_id: 1,
          agent_id: 'github-copilot',
          event_count: BigInt(1000),
          session_count: BigInt(25),
          avg_prompt_tokens: 800.5,
          avg_response_tokens: 400.2,
          total_duration: BigInt(36000000),
        },
      ]);

      if (service['prisma']) {
        service['prisma'].$queryRawUnsafe = mockQueryRaw;
      }

      const results = await service.getDailyStats(
        1,
        'github-copilot',
        new Date('2025-11-01T00:00:00Z'),
        new Date('2025-11-30T00:00:00Z'),
      );

      // Verify query targets daily continuous aggregate
      const query = mockQueryRaw.mock.calls[0][0] as string;
      expect(query).toContain('agent_events_daily');
      expect(query).toContain('WHERE');

      // Verify results
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        bucket: expect.any(Date),
        projectId: 1,
        agentId: 'github-copilot',
        eventCount: 1000,
      });
    });

    it('should handle date range filters correctly', async () => {
      await service.initialize();

      const mockQueryRaw = vi.fn().mockResolvedValue([]);
      if (service['prisma']) {
        service['prisma'].$queryRawUnsafe = mockQueryRaw;
      }

      const startDate = new Date('2025-10-01T00:00:00Z');
      const endDate = new Date('2025-10-31T00:00:00Z');

      await service.getDailyStats(1, undefined, startDate, endDate);

      // Verify parameters include date range
      const params = mockQueryRaw.mock.calls[0].slice(1);
      expect(params).toContain(startDate);
      expect(params).toContain(endDate);
    });

    it('should fallback to getTimeBucketStats when continuous aggregate fails', async () => {
      await service.initialize();

      const mockQueryRaw = vi
        .fn()
        .mockRejectedValue(new Error('relation "agent_events_daily" does not exist'));

      if (service['prisma']) {
        service['prisma'].$queryRawUnsafe = mockQueryRaw;
      }

      const getTimeBucketStatsSpy = vi.spyOn(service, 'getTimeBucketStats').mockResolvedValue([]);

      await service.getDailyStats(1);

      expect(getTimeBucketStatsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          interval: '1 day',
          projectId: 1,
        }),
      );
    });
  });

  describe('SQL query parameter handling', () => {
    it('should properly escape and parameterize SQL queries', async () => {
      await service.initialize();

      const mockQueryRaw = vi.fn().mockResolvedValue([]);
      if (service['prisma']) {
        service['prisma'].$queryRawUnsafe = mockQueryRaw;
      }

      await service.getTimeBucketStats({
        interval: '1 hour',
        projectId: 1,
        agentId: 'github-copilot',
        eventType: 'file_write',
      });

      // Verify parameterized query (no raw values in SQL string)
      const query = mockQueryRaw.mock.calls[0][0] as string;
      expect(query).toContain('$1');
      expect(query).toContain('$2');
      expect(query).not.toContain('github-copilot'); // Should be parameterized
      expect(query).not.toContain('file_write'); // Should be parameterized
    });
  });

  describe('result mapping', () => {
    it('should properly convert BigInt to Number in results', async () => {
      await service.initialize();

      const mockQueryRaw = vi.fn().mockResolvedValue([
        {
          bucket: new Date('2025-11-01T12:00:00Z'),
          project_id: 1,
          agent_id: 'test-agent',
          event_count: BigInt(9999999999), // Large BigInt
          avg_duration: null, // Test null handling
          total_tokens: BigInt(0), // Test zero
        },
      ]);

      if (service['prisma']) {
        service['prisma'].$queryRawUnsafe = mockQueryRaw;
      }

      const results = await service.getTimeBucketStats({
        interval: '1 hour',
        projectId: 1,
      });

      expect(results[0].eventCount).toBe(9999999999);
      expect(results[0].avgDuration).toBeUndefined();
      expect(results[0].totalTokens).toBe(0);
    });
  });
});
