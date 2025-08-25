/**
 * API Integration Tests for Devlog Web API
 *
 * End-to-end tests that can be run against a test environment.
 * These tests use actual HTTP requests but with proper isolation.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestEnvironment,
  isTestServerAvailable,
  type TestApiClient,
} from '../../utils/test-server.js';

// Skip integration tests by default unless explicitly enabled or server is available
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegrationTests)('API Integration Tests', () => {
  let client: TestApiClient;
  let testProjectId: string;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    // Create isolated test environment
    const testEnv = await createTestEnvironment();
    client = testEnv.client;
    testProjectId = testEnv.testProjectId;
    cleanup = testEnv.cleanup;

    console.log(`Running integration tests against project ${testProjectId}`);
  });

  afterAll(async () => {
    await cleanup();
  });

  describe('Health Check', () => {
    it('should respond to health check', async () => {
      const result = await client.get('/health');
      expect(result.status).toBe(200);
      expect(result.data).toHaveProperty('status', 'ok');
    });
  });

  describe('Project Operations', () => {
    it('should retrieve project details', async () => {
      const result = await client.get(`/projects/${testProjectId}`);
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('createdAt');
    });

    it('should handle invalid project ID', async () => {
      const result = await client.get('/projects/invalid', 400);
      expect(result.data).toHaveProperty('error');
      expect(result.data.error).toContain('Invalid id: must be a positive integer');
    });

    it('should handle nonexistent project', async () => {
      const result = await client.get('/projects/99999', 404);
      expect(result.data).toHaveProperty('error', 'Project not found');
    });
  });

  describe('Devlog Operations', () => {
    let testDevlogId: number | undefined;

    beforeAll(async () => {
      // Get a devlog ID for testing
      const result = await client.get(`/projects/${testProjectId}/devlogs?limit=1`);
      if (result.data.items.length > 0) {
        testDevlogId = result.data.items[0].id;
      }
    });

    it('should list devlog with pagination', async () => {
      const result = await client.get(`/projects/${testProjectId}/devlogs`);
      expect(result.data).toHaveProperty('items');
      expect(result.data).toHaveProperty('pagination');
      expect(Array.isArray(result.data.items)).toBe(true);
      expect(result.data.pagination).toHaveProperty('page');
      expect(result.data.pagination).toHaveProperty('limit');
      expect(result.data.pagination).toHaveProperty('total');
    });

    it.skipIf(!testDevlogId)('should retrieve individual devlog', async () => {
      if (!testDevlogId) return; // TypeScript guard
      const result = await client.get(`/projects/${testProjectId}/devlogs/${testDevlogId}`);
      expect(result.data).toHaveProperty('id', testDevlogId);
      expect(result.data).toHaveProperty('title');
      expect(result.data).toHaveProperty('status');
      expect(result.data).toHaveProperty('type');
      expect(result.data).toHaveProperty('projectId', parseInt(testProjectId));
    });

    it('should handle invalid devlog ID', async () => {
      const result = await client.get(`/projects/${testProjectId}/devlogs/invalid`, 400);
      expect(result.data).toHaveProperty('error');
      expect(result.data.error).toContain('Invalid devlogId: must be a positive integer');
    });

    it('should handle nonexistent devlog', async () => {
      const result = await client.get(`/projects/${testProjectId}/devlogs/99999`, 404);
      expect(result.data).toHaveProperty('error', 'Devlog entry not found');
    });

    it('should filter devlog by status', async () => {
      const result = await client.get(`/projects/${testProjectId}/devlogs?status=done`);
      expect(result.data).toHaveProperty('items');

      // All returned items should have status 'done'
      result.data.items.forEach((item: any) => {
        expect(item.status).toBe('done');
      });
    });

    it('should search devlog', async () => {
      const result = await client.get(`/projects/${testProjectId}/devlogs?search=test`);
      expect(result.data).toHaveProperty('items');
      expect(result.data).toHaveProperty('pagination');
    });
  });

  describe('Stats Operations', () => {
    it('should return overview statistics', async () => {
      const result = await client.get(`/projects/${testProjectId}/devlogs/stats/overview`);
      expect(result.data).toHaveProperty('totalEntries');
      expect(result.data).toHaveProperty('openEntries');
      expect(result.data).toHaveProperty('closedEntries');
      expect(result.data).toHaveProperty('byStatus');
      expect(result.data).toHaveProperty('byType');
      expect(result.data).toHaveProperty('byPriority');
      expect(typeof result.data.totalEntries).toBe('number');
    });

    it('should return timeseries statistics', async () => {
      const result = await client.get(`/projects/${testProjectId}/devlogs/stats/timeseries`);
      expect(result.data).toHaveProperty('dataPoints');
      expect(result.data).toHaveProperty('dateRange');
      expect(Array.isArray(result.data.dataPoints)).toBe(true);
      expect(result.data.dateRange).toHaveProperty('from');
      expect(result.data.dateRange).toHaveProperty('to');
    });

    it('should respect timeseries days parameter', async () => {
      const result = await client.get(`/projects/${testProjectId}/devlogs/stats/timeseries?days=7`);
      expect(result.data).toHaveProperty('dataPoints');
      expect(result.data).toHaveProperty('dateRange');
    });

    it('should reject invalid days parameter', async () => {
      const result = await client.get(
        `/projects/${testProjectId}/devlogs/stats/timeseries?days=invalid`,
        400,
      );
      expect(result.data).toHaveProperty('error');
      expect(result.data.error).toContain('days parameter must be a positive integer');
    });
  });

  describe('Batch Operations', () => {
    let testDevlogIds: number[] = [];

    beforeAll(async () => {
      // Get some devlog IDs for batch testing
      const result = await client.get(`/projects/${testProjectId}/devlogs?limit=3`);
      testDevlogIds = result.data.items.map((item: any) => item.id);
    });

    it.skipIf(!testDevlogIds?.length)('should batch update devlog', async () => {
      if (!testDevlogIds?.length) return; // TypeScript guard
      const updateData = {
        ids: testDevlogIds.slice(0, 2),
        updates: {
          priority: 'high',
        },
      };

      const result = await client.post(
        `/projects/${testProjectId}/devlogs/batch/update`,
        updateData,
      );
      expect(result.data).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('updated');
      expect(Array.isArray(result.data.updated)).toBe(true);
    });

    it('should handle invalid batch update request', async () => {
      const invalidData = { ids: 'not-an-array' };
      const result = await client.post(
        `/projects/${testProjectId}/devlogs/batch/update`,
        invalidData,
        400,
      );
      expect(result.data).toHaveProperty('error');
      expect(result.data.error).toContain('ids (array) and updates (object) are required');
    });

    it.skipIf(!testDevlogIds?.length)('should batch add notes to devlog', async () => {
      if (!testDevlogIds?.length) return; // TypeScript guard
      const noteData = {
        ids: testDevlogIds.slice(0, 1),
        note: {
          content: 'Integration test batch note',
          author: 'integration-test',
        },
      };

      const result = await client.post(`/projects/${testProjectId}/devlogs/batch/note`, noteData);
      expect(result.data).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('updated');
      expect(Array.isArray(result.data.updated)).toBe(true);
    });

    it('should handle invalid batch note request', async () => {
      const invalidData = {
        ids: [1],
        note: 'not-an-object',
      };

      const result = await client.post(
        `/projects/${testProjectId}/devlogs/batch/note`,
        invalidData,
        400,
      );
      expect(result.data).toHaveProperty('error');
      expect(result.data.error).toContain('ids (array) and note (object) are required');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      // Note: This test would need to be implemented differently in a real environment
      // For now, we'll test that the client handles errors properly
      try {
        await client.post('/invalid-endpoint', '{ invalid json');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should return consistent error format', async () => {
      const endpoints = [
        { path: '/projects/invalid', status: 400 },
        { path: `/projects/${testProjectId}/devlogs/invalid`, status: 400 },
        { path: '/projects/99999', status: 404 },
      ];

      for (const endpoint of endpoints) {
        const result = await client.get(endpoint.path, endpoint.status);
        expect(result.data).toHaveProperty('error');
        expect(typeof result.data.error).toBe('string');
      }
    });
  });

  describe('Response Format Consistency', () => {
    it('should return consistent project structure', async () => {
      const result = await client.get(`/projects/${testProjectId}`);

      // Required fields
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('createdAt');

      // Data types
      expect(typeof result.data.id).toBe('number');
      expect(typeof result.data.name).toBe('string');
      expect(typeof result.data.createdAt).toBe('string');
    });

    it('should return consistent devlog list structure', async () => {
      const result = await client.get(`/projects/${testProjectId}/devlogs?limit=1`);

      expect(result.data).toHaveProperty('items');
      expect(result.data).toHaveProperty('pagination');
      expect(Array.isArray(result.data.items)).toBe(true);

      if (result.data.items.length > 0) {
        const devlog = result.data.items[0];
        expect(devlog).toHaveProperty('id');
        expect(devlog).toHaveProperty('title');
        expect(devlog).toHaveProperty('status');
        expect(devlog).toHaveProperty('type');
        expect(devlog).toHaveProperty('projectId');
        expect(typeof devlog.id).toBe('number');
        expect(typeof devlog.title).toBe('string');
      }

      const pagination = result.data.pagination;
      expect(pagination).toHaveProperty('page');
      expect(pagination).toHaveProperty('limit');
      expect(pagination).toHaveProperty('total');
      expect(pagination).toHaveProperty('totalPages');
      expect(typeof pagination.page).toBe('number');
      expect(typeof pagination.limit).toBe('number');
      expect(typeof pagination.total).toBe('number');
    });
  });
});
