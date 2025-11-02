/**
 * Agent Observability API Integration Tests
 *
 * Tests for agent sessions and events API endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestEnvironment, type TestApiClient } from '../../utils/test-server.js';

// Skip integration tests by default unless explicitly enabled
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegrationTests)('Agent Observability API Integration Tests', () => {
  let client: TestApiClient;
  let testProjectId: string;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    // Create isolated test environment
    const testEnv = await createTestEnvironment();
    client = testEnv.client;
    testProjectId = testEnv.testProjectId;
    cleanup = testEnv.cleanup;

    console.log(`Running agent observability tests against project ${testProjectId}`);
  });

  afterAll(async () => {
    await cleanup();
  });

  describe('Agent Session Operations', () => {
    let testSessionId: string | undefined;

    it('should create a new agent session', async () => {
      const sessionData = {
        agentId: 'github-copilot',
        agentVersion: '1.0.0',
        projectId: parseInt(testProjectId),
        context: {
          objective: 'Test session creation',
          branch: 'main',
          initialCommit: 'abc123',
          triggeredBy: 'user',
        },
      };

      const result = await client.post('/sessions', sessionData);

      expect(result.status).toBe(201);
      expect(result.data).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('data');
      expect(result.data.data).toHaveProperty('id');
      expect(result.data.data).toHaveProperty('agentId', 'github-copilot');
      expect(result.data.data).toHaveProperty('projectId', parseInt(testProjectId));
      expect(result.data.data).toHaveProperty('startTime');
      expect(result.data.data.endTime).toBeUndefined();

      testSessionId = result.data.data.id;
    });

    it('should reject session creation with missing required fields', async () => {
      const invalidData = {
        agentId: 'github-copilot',
        // Missing agentVersion, projectId, context
      };

      const result = await client.post('/sessions', invalidData, 400);
      expect(result.data).toHaveProperty('success', false);
      expect(result.data).toHaveProperty('error');
      expect(result.data.error).toContain('Missing required fields');
    });

    it('should reject session creation with invalid context', async () => {
      const invalidData = {
        agentId: 'github-copilot',
        agentVersion: '1.0.0',
        projectId: parseInt(testProjectId),
        context: {
          objective: 'Test',
          // Missing required: branch, initialCommit, triggeredBy
        },
      };

      const result = await client.post('/sessions', invalidData, 400);
      expect(result.data).toHaveProperty('success', false);
      expect(result.data).toHaveProperty('error');
      expect(result.data.error).toContain('Missing required context fields');
    });

    it('should list agent sessions', async () => {
      const result = await client.get('/sessions');

      expect(result.data).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('data');
      expect(Array.isArray(result.data.data)).toBe(true);
      expect(result.data).toHaveProperty('pagination');
    });

    it('should retrieve a specific session by ID', async () => {
      if (!testSessionId) {
        console.log('Skipping: no test session available');
        return;
      }

      const result = await client.get(`/sessions/${testSessionId}`);

      expect(result.data).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('data');
      expect(result.data.data).toHaveProperty('id', testSessionId);
      expect(result.data.data).toHaveProperty('agentId');
      expect(result.data.data).toHaveProperty('projectId');
      expect(result.data.data).toHaveProperty('startTime');
    });

    it('should update a session', async () => {
      if (!testSessionId) {
        console.log('Skipping: no test session available');
        return;
      }

      const updateData = {
        metrics: {
          eventsCount: 5,
          filesModified: 2,
          linesAdded: 100,
          linesRemoved: 20,
        },
      };

      const result = await client.patch(`/sessions/${testSessionId}`, updateData);

      expect(result.data).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('data');
      expect(result.data.data.metrics.eventsCount).toBe(5);
      expect(result.data.data.metrics.filesModified).toBe(2);
    });

    it('should end a session with outcome', async () => {
      if (!testSessionId) {
        console.log('Skipping: no test session available');
        return;
      }

      const endData = {
        outcome: 'success',
      };

      const result = await client.patch(`/sessions/${testSessionId}`, endData);

      expect(result.data).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('data');
      expect(result.data.data).toHaveProperty('endTime');
      expect(result.data.data).toHaveProperty('outcome', 'success');
      expect(result.data.data).toHaveProperty('duration');
    });

    it('should handle nonexistent session', async () => {
      const result = await client.get('/sessions/nonexistent-session-id', 404);
      expect(result.data).toHaveProperty('success', false);
      expect(result.data).toHaveProperty('error');
      expect(result.data.error).toContain('Session not found');
    });
  });

  describe('Agent Event Operations', () => {
    let testSessionId: string;
    let testEventId: string | undefined;

    beforeAll(async () => {
      // Create a session for event testing
      const sessionData = {
        agentId: 'github-copilot',
        agentVersion: '1.0.0',
        projectId: parseInt(testProjectId),
        context: {
          objective: 'Test event creation',
          branch: 'main',
          initialCommit: 'abc123',
          triggeredBy: 'user',
        },
      };

      const result = await client.post('/sessions', sessionData);
      testSessionId = result.data.data.id;
    });

    it('should create a single event', async () => {
      const eventData = {
        type: 'file_write',
        agentId: 'github-copilot',
        agentVersion: '1.0.0',
        sessionId: testSessionId,
        projectId: parseInt(testProjectId),
        context: {
          workingDirectory: '/test/project',
          filePath: 'src/test.ts',
          branch: 'main',
        },
        data: {
          content: 'test content',
        },
        severity: 'info',
      };

      const result = await client.post('/events', eventData);

      expect(result.status).toBe(201);
      expect(result.data).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('data');
      expect(result.data.data).toHaveProperty('id');
      expect(result.data.data).toHaveProperty('type', 'file_write');
      expect(result.data.data).toHaveProperty('sessionId', testSessionId);
      expect(result.data.data).toHaveProperty('timestamp');

      testEventId = result.data.data.id;
    });

    it('should reject event creation with missing required fields', async () => {
      const invalidData = {
        type: 'file_write',
        agentId: 'github-copilot',
        // Missing required fields
      };

      const result = await client.post('/events', invalidData, 400);
      expect(result.data).toHaveProperty('success', false);
      expect(result.data).toHaveProperty('error');
      expect(result.data.error).toContain('Missing required fields');
    });

    it('should create events in batch', async () => {
      const eventsData = [
        {
          timestamp: new Date().toISOString(),
          eventType: 'file_read',
          agentId: 'github-copilot',
          agentVersion: '1.0.0',
          sessionId: testSessionId,
          projectId: parseInt(testProjectId),
          context: {
            workingDirectory: '/test/project',
            filePath: 'src/file1.ts',
          },
          data: {},
          severity: 'info',
        },
        {
          timestamp: new Date().toISOString(),
          eventType: 'file_write',
          agentId: 'github-copilot',
          agentVersion: '1.0.0',
          sessionId: testSessionId,
          projectId: parseInt(testProjectId),
          context: {
            workingDirectory: '/test/project',
            filePath: 'src/file2.ts',
          },
          data: {},
          severity: 'info',
        },
      ];

      const result = await client.post('/events/batch', eventsData);

      expect(result.status).toBe(201);
      expect(result.data).toHaveProperty('created');
      expect(result.data).toHaveProperty('requested');
      expect(result.data.created).toBe(2);
      expect(result.data.requested).toBe(2);
    });

    it('should retrieve events for a session', async () => {
      const result = await client.get(`/sessions/${testSessionId}/events`);

      expect(result.data).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('data');
      expect(Array.isArray(result.data.data)).toBe(true);
      expect(result.data.data.length).toBeGreaterThan(0);

      // Check that events belong to the session
      result.data.data.forEach((event: any) => {
        expect(event.sessionId).toBe(testSessionId);
      });
    });

    it('should filter events by type', async () => {
      const result = await client.get(`/sessions/${testSessionId}/events?eventType=file_write`);

      expect(result.data).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('data');
      expect(Array.isArray(result.data.data)).toBe(true);

      // All events should be of type 'file_write'
      result.data.data.forEach((event: any) => {
        expect(event.type).toBe('file_write');
      });
    });
  });

  describe('Response Format Consistency', () => {
    it('should return consistent session structure', async () => {
      const sessionData = {
        agentId: 'github-copilot',
        agentVersion: '1.0.0',
        projectId: parseInt(testProjectId),
        context: {
          objective: 'Test structure',
          branch: 'main',
          initialCommit: 'abc123',
          triggeredBy: 'user',
        },
      };

      const result = await client.post('/sessions', sessionData);
      const session = result.data.data;

      // Required fields
      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('agentId');
      expect(session).toHaveProperty('agentVersion');
      expect(session).toHaveProperty('projectId');
      expect(session).toHaveProperty('startTime');
      expect(session).toHaveProperty('context');
      expect(session).toHaveProperty('metrics');

      // Data types
      expect(typeof session.id).toBe('string');
      expect(typeof session.agentId).toBe('string');
      expect(typeof session.projectId).toBe('number');
      expect(typeof session.startTime).toBe('string');
      expect(typeof session.context).toBe('object');
      expect(typeof session.metrics).toBe('object');
    });

    it('should return consistent event structure', async () => {
      // Create a session first
      const sessionData = {
        agentId: 'github-copilot',
        agentVersion: '1.0.0',
        projectId: parseInt(testProjectId),
        context: {
          objective: 'Test event structure',
          branch: 'main',
          initialCommit: 'abc123',
          triggeredBy: 'user',
        },
      };

      const sessionResult = await client.post('/sessions', sessionData);
      const sessionId = sessionResult.data.data.id;

      // Create an event
      const eventData = {
        type: 'file_write',
        agentId: 'github-copilot',
        agentVersion: '1.0.0',
        sessionId: sessionId,
        projectId: parseInt(testProjectId),
        context: {
          workingDirectory: '/test/project',
          filePath: 'src/test.ts',
        },
        data: {},
        severity: 'info',
      };

      const result = await client.post('/events', eventData);
      const event = result.data.data;

      // Required fields
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('type');
      expect(event).toHaveProperty('agentId');
      expect(event).toHaveProperty('sessionId');
      expect(event).toHaveProperty('projectId');
      expect(event).toHaveProperty('context');
      expect(event).toHaveProperty('data');

      // Data types
      expect(typeof event.id).toBe('string');
      expect(typeof event.timestamp).toBe('string');
      expect(typeof event.type).toBe('string');
      expect(typeof event.agentId).toBe('string');
      expect(typeof event.sessionId).toBe('string');
      expect(typeof event.projectId).toBe('number');
      expect(typeof event.context).toBe('object');
    });
  });
});
