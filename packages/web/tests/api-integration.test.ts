/**
 * API Integration Tests for Devlog Web API
 *
 * End-to-end tests that can be run against a test environment.
 * These tests use actual HTTP requests but against isolated test data.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Test configuration - should point to test environment
const TEST_API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3201/api';
const TEST_PROJECT_ID = process.env.TEST_PROJECT_ID || '1';

/**
 * Integration Test Client
 * Makes actual HTTP requests to the API
 */
class IntegrationTestClient {
  constructor(private baseUrl: string) {}

  async get(path: string, expectedStatus = 200) {
    const response = await fetch(`${this.baseUrl}${path}`);
    const data = response.status !== 204 ? await response.json() : null;

    if (response.status !== expectedStatus) {
      throw new Error(
        `Expected ${expectedStatus}, got ${response.status}: ${JSON.stringify(data)}`,
      );
    }

    return { status: response.status, data };
  }

  async post(path: string, body: any, expectedStatus = 200) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = response.status !== 204 ? await response.json() : null;

    if (response.status !== expectedStatus) {
      throw new Error(
        `Expected ${expectedStatus}, got ${response.status}: ${JSON.stringify(data)}`,
      );
    }

    return { status: response.status, data };
  }

  async put(path: string, body: any, expectedStatus = 200) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = response.status !== 204 ? await response.json() : null;

    if (response.status !== expectedStatus) {
      throw new Error(
        `Expected ${expectedStatus}, got ${response.status}: ${JSON.stringify(data)}`,
      );
    }

    return { status: response.status, data };
  }

  async delete(path: string, expectedStatus = 200) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
    });
    const data = response.status !== 204 ? await response.json() : null;

    if (response.status !== expectedStatus) {
      throw new Error(
        `Expected ${expectedStatus}, got ${response.status}: ${JSON.stringify(data)}`,
      );
    }

    return { status: response.status, data };
  }
}

// Skip integration tests by default unless explicitly enabled
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegrationTests)('API Integration Tests', () => {
  let client: IntegrationTestClient;

  beforeAll(() => {
    client = new IntegrationTestClient(TEST_API_BASE_URL);
    console.log(`Running integration tests against: ${TEST_API_BASE_URL}`);
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
      const result = await client.get(`/projects/${TEST_PROJECT_ID}`);
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
      const result = await client.get(`/projects/${TEST_PROJECT_ID}/devlogs?limit=1`);
      if (result.data.items.length > 0) {
        testDevlogId = result.data.items[0].id;
      }
    });

    it('should list devlogs with pagination', async () => {
      const result = await client.get(`/projects/${TEST_PROJECT_ID}/devlogs`);
      expect(result.data).toHaveProperty('items');
      expect(result.data).toHaveProperty('pagination');
      expect(Array.isArray(result.data.items)).toBe(true);
      expect(result.data.pagination).toHaveProperty('page');
      expect(result.data.pagination).toHaveProperty('limit');
      expect(result.data.pagination).toHaveProperty('total');
    });

    it.skipIf(!testDevlogId)('should retrieve individual devlog', async () => {
      if (!testDevlogId) return; // TypeScript guard
      const result = await client.get(`/projects/${TEST_PROJECT_ID}/devlogs/${testDevlogId}`);
      expect(result.data).toHaveProperty('id', testDevlogId);
      expect(result.data).toHaveProperty('title');
      expect(result.data).toHaveProperty('status');
      expect(result.data).toHaveProperty('type');
      expect(result.data).toHaveProperty('projectId', parseInt(TEST_PROJECT_ID));
    });

    it('should handle invalid devlog ID', async () => {
      const result = await client.get(`/projects/${TEST_PROJECT_ID}/devlogs/invalid`, 400);
      expect(result.data).toHaveProperty('error');
      expect(result.data.error).toContain('Invalid devlogId: must be a positive integer');
    });

    it('should handle nonexistent devlog', async () => {
      const result = await client.get(`/projects/${TEST_PROJECT_ID}/devlogs/99999`, 404);
      expect(result.data).toHaveProperty('error', 'Devlog entry not found');
    });

    it('should filter devlogs by status', async () => {
      const result = await client.get(`/projects/${TEST_PROJECT_ID}/devlogs?status=done`);
      expect(result.data).toHaveProperty('items');

      // All returned items should have status 'done'
      result.data.items.forEach((item: any) => {
        expect(item.status).toBe('done');
      });
    });

    it('should search devlogs', async () => {
      const result = await client.get(`/projects/${TEST_PROJECT_ID}/devlogs?search=test`);
      expect(result.data).toHaveProperty('items');
      expect(result.data).toHaveProperty('pagination');
    });
  });

  describe('Stats Operations', () => {
    it('should return overview statistics', async () => {
      const result = await client.get(`/projects/${TEST_PROJECT_ID}/devlogs/stats/overview`);
      expect(result.data).toHaveProperty('totalEntries');
      expect(result.data).toHaveProperty('openEntries');
      expect(result.data).toHaveProperty('closedEntries');
      expect(result.data).toHaveProperty('byStatus');
      expect(result.data).toHaveProperty('byType');
      expect(result.data).toHaveProperty('byPriority');
      expect(typeof result.data.totalEntries).toBe('number');
    });

    it('should return timeseries statistics', async () => {
      const result = await client.get(`/projects/${TEST_PROJECT_ID}/devlogs/stats/timeseries`);
      expect(result.data).toHaveProperty('dataPoints');
      expect(result.data).toHaveProperty('dateRange');
      expect(Array.isArray(result.data.dataPoints)).toBe(true);
      expect(result.data.dateRange).toHaveProperty('from');
      expect(result.data.dateRange).toHaveProperty('to');
    });

    it('should respect timeseries days parameter', async () => {
      const result = await client.get(
        `/projects/${TEST_PROJECT_ID}/devlogs/stats/timeseries?days=7`,
      );
      expect(result.data).toHaveProperty('dataPoints');
      expect(result.data).toHaveProperty('dateRange');
    });

    it('should reject invalid days parameter', async () => {
      const result = await client.get(
        `/projects/${TEST_PROJECT_ID}/devlogs/stats/timeseries?days=invalid`,
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
      const result = await client.get(`/projects/${TEST_PROJECT_ID}/devlogs?limit=3`);
      testDevlogIds = result.data.items.map((item: any) => item.id);
    });

    it.skipIf(!testDevlogIds?.length)('should batch update devlogs', async () => {
      if (!testDevlogIds?.length) return; // TypeScript guard
      const updateData = {
        ids: testDevlogIds.slice(0, 2),
        updates: {
          priority: 'high',
        },
      };

      const result = await client.post(
        `/projects/${TEST_PROJECT_ID}/devlogs/batch/update`,
        updateData,
      );
      expect(result.data).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('updated');
      expect(Array.isArray(result.data.updated)).toBe(true);
    });

    it('should handle invalid batch update request', async () => {
      const invalidData = { ids: 'not-an-array' };
      const result = await client.post(
        `/projects/${TEST_PROJECT_ID}/devlogs/batch/update`,
        invalidData,
        400,
      );
      expect(result.data).toHaveProperty('error');
      expect(result.data.error).toContain('ids (array) and updates (object) are required');
    });

    it.skipIf(!testDevlogIds?.length)('should batch add notes to devlogs', async () => {
      if (!testDevlogIds?.length) return; // TypeScript guard
      const noteData = {
        ids: testDevlogIds.slice(0, 1),
        note: {
          content: 'Integration test batch note',
          author: 'integration-test',
        },
      };

      const result = await client.post(`/projects/${TEST_PROJECT_ID}/devlogs/batch/note`, noteData);
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
        `/projects/${TEST_PROJECT_ID}/devlogs/batch/note`,
        invalidData,
        400,
      );
      expect(result.data).toHaveProperty('error');
      expect(result.data.error).toContain('ids (array) and note (object) are required');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await fetch(
        `${TEST_API_BASE_URL}/projects/${TEST_PROJECT_ID}/devlogs/batch/update`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{ invalid json',
        },
      );

      expect(response.status).toBe(400);
    });

    it('should return consistent error format', async () => {
      const endpoints = [
        { path: '/projects/invalid', status: 400 },
        { path: `/projects/${TEST_PROJECT_ID}/devlogs/invalid`, status: 400 },
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
      const result = await client.get(`/projects/${TEST_PROJECT_ID}`);

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
      const result = await client.get(`/projects/${TEST_PROJECT_ID}/devlogs?limit=1`);

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
