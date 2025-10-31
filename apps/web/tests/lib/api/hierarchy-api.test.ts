/**
 * Hierarchy API Integration Tests
 *
 * Tests for Week 3 backend implementation:
 * - Machine endpoints
 * - Workspace endpoints
 * - Project hierarchy endpoints
 * - Event filtering
 * - Real-time streaming (basic validation)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestEnvironment,
  type TestApiClient,
} from '../../utils/test-server.js';

// Skip integration tests by default unless explicitly enabled
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegrationTests)('Hierarchy API Integration Tests', () => {
  let client: TestApiClient;
  let cleanup: () => Promise<void>;

  // Test data
  let testMachineId: number;
  let testWorkspaceId: number;
  let testProjectId: number;
  let testSessionId: string;

  beforeAll(async () => {
    const testEnv = await createTestEnvironment();
    client = testEnv.client;
    cleanup = testEnv.cleanup;

    console.log('Running hierarchy API integration tests');
  });

  afterAll(async () => {
    await cleanup();
  });

  describe('Machine Endpoints', () => {
    it('should create/upsert a machine', async () => {
      const machineData = {
        machineId: `test-machine-${Date.now()}`,
        hostname: 'test-host',
        username: 'testuser',
        osType: 'linux',
        osVersion: '22.04',
        machineType: 'local',
        ipAddress: '192.168.1.100',
        metadata: { test: true },
      };

      const result = await client.post('/machines', machineData);
      
      expect(result.status).toBe(200);
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('machineId', machineData.machineId);
      expect(result.data).toHaveProperty('hostname', machineData.hostname);
      expect(result.data).toHaveProperty('osType', machineData.osType);

      // Store for later tests
      testMachineId = result.data.id;
    });

    it('should update existing machine on upsert', async () => {
      const machineData = {
        machineId: `test-machine-${Date.now()}`,
        hostname: 'test-host-updated',
        username: 'testuser',
        osType: 'linux',
        osVersion: '24.04', // Updated
        machineType: 'local',
      };

      // Create first
      const createResult = await client.post('/machines', machineData);
      expect(createResult.status).toBe(200);

      // Update
      const updateData = { ...machineData, osVersion: '24.10' };
      const updateResult = await client.post('/machines', updateData);
      
      expect(updateResult.status).toBe(200);
      expect(updateResult.data.osVersion).toBe('24.10');
      expect(updateResult.data.id).toBe(createResult.data.id); // Same ID
    });

    it('should reject invalid machine data', async () => {
      const invalidData = {
        machineId: 'test',
        hostname: 'test',
        username: 'test',
        osType: 'invalid-os', // Invalid
        machineType: 'local',
      };

      const result = await client.post('/machines', invalidData, 400);
      expect(result.data).toHaveProperty('error');
    });

    it('should list all machines', async () => {
      const result = await client.get('/machines');
      
      expect(result.status).toBe(200);
      expect(Array.isArray(result.data)).toBe(true);
      
      if (result.data.length > 0) {
        const machine = result.data[0];
        expect(machine).toHaveProperty('id');
        expect(machine).toHaveProperty('machineId');
        expect(machine).toHaveProperty('hostname');
        expect(machine).toHaveProperty('_count');
        expect(machine._count).toHaveProperty('workspaces');
      }
    });

    it('should get machine by ID', async () => {
      if (!testMachineId) {
        // Get first machine
        const listResult = await client.get('/machines');
        if (listResult.data.length > 0) {
          testMachineId = listResult.data[0].id;
        }
      }

      if (testMachineId) {
        const result = await client.get(`/machines/${testMachineId}`);
        
        expect(result.status).toBe(200);
        expect(result.data).toHaveProperty('id', testMachineId);
        expect(result.data).toHaveProperty('workspaces');
        expect(Array.isArray(result.data.workspaces)).toBe(true);
      }
    });

    it('should handle invalid machine ID', async () => {
      const result = await client.get('/machines/invalid', 400);
      expect(result.data).toHaveProperty('error');
    });

    it('should handle non-existent machine', async () => {
      const result = await client.get('/machines/999999', 404);
      expect(result.data).toHaveProperty('error');
    });
  });

  describe('Workspace Endpoints', () => {
    beforeAll(async () => {
      // Ensure we have a machine and project for workspace tests
      if (!testMachineId) {
        const machines = await client.get('/machines');
        if (machines.data.length > 0) {
          testMachineId = machines.data[0].id;
        }
      }

      // Get a project ID
      const projects = await client.get('/projects');
      if (projects.data && projects.data.length > 0) {
        testProjectId = projects.data[0].id;
      }
    });

    it('should create/upsert a workspace', async () => {
      if (!testMachineId || !testProjectId) {
        console.log('Skipping: requires machine and project');
        return;
      }

      const workspaceData = {
        projectId: testProjectId,
        machineId: testMachineId,
        workspaceId: `test-ws-${Date.now()}`,
        workspacePath: '/path/to/workspace',
        workspaceType: 'folder',
        branch: 'main',
        commit: 'abc123',
      };

      const result = await client.post('/workspaces', workspaceData);
      
      expect(result.status).toBe(200);
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('workspaceId', workspaceData.workspaceId);
      expect(result.data).toHaveProperty('projectId', testProjectId);
      expect(result.data).toHaveProperty('machineId', testMachineId);

      testWorkspaceId = result.data.id;
    });

    it('should reject invalid workspace data', async () => {
      const invalidData = {
        projectId: -1, // Invalid
        machineId: testMachineId || 1,
        workspaceId: 'test',
        workspacePath: '/path',
        workspaceType: 'invalid-type', // Invalid
      };

      const result = await client.post('/workspaces', invalidData, 400);
      expect(result.data).toHaveProperty('error');
    });

    it('should get workspace by VS Code ID', async () => {
      if (!testWorkspaceId) {
        console.log('Skipping: requires workspace');
        return;
      }

      // Get the workspace's VS Code ID first
      const machines = await client.get(`/machines/${testMachineId}`);
      if (machines.data.workspaces && machines.data.workspaces.length > 0) {
        const workspace = machines.data.workspaces[0];
        const result = await client.get(`/workspaces/${workspace.workspaceId}`);
        
        expect(result.status).toBe(200);
        expect(result.data).toHaveProperty('workspace');
        expect(result.data).toHaveProperty('context');
        expect(result.data.workspace).toHaveProperty('project');
        expect(result.data.workspace).toHaveProperty('machine');
        expect(result.data.workspace).toHaveProperty('chatSessions');
      }
    });

    it('should handle non-existent workspace', async () => {
      const result = await client.get('/workspaces/non-existent-uuid', 404);
      expect(result.data).toHaveProperty('error');
    });
  });

  describe('Project Hierarchy Endpoints', () => {
    beforeAll(async () => {
      // Ensure we have a project
      if (!testProjectId) {
        const projects = await client.get('/projects');
        if (projects.data && projects.data.length > 0) {
          testProjectId = projects.data[0].id;
        }
      }
    });

    it('should get project hierarchy', async () => {
      if (!testProjectId) {
        console.log('Skipping: requires project');
        return;
      }

      const result = await client.get(`/projects/${testProjectId}/hierarchy`);
      
      expect(result.status).toBe(200);
      expect(result.data).toHaveProperty('project');
      expect(result.data).toHaveProperty('machines');
      expect(Array.isArray(result.data.machines)).toBe(true);

      if (result.data.machines.length > 0) {
        const machine = result.data.machines[0];
        expect(machine).toHaveProperty('machine');
        expect(machine).toHaveProperty('workspaces');
        expect(Array.isArray(machine.workspaces)).toBe(true);

        if (machine.workspaces.length > 0) {
          const workspace = machine.workspaces[0];
          expect(workspace).toHaveProperty('workspace');
          expect(workspace).toHaveProperty('sessions');
          expect(workspace).toHaveProperty('eventCount');
        }
      }
    });

    it('should handle invalid project ID for hierarchy', async () => {
      const result = await client.get('/projects/invalid/hierarchy', 400);
      expect(result.data).toHaveProperty('error');
    });

    it('should handle non-existent project hierarchy', async () => {
      const result = await client.get('/projects/999999/hierarchy', 404);
      expect(result.data).toHaveProperty('error');
    });
  });

  describe('Project Events Filtering', () => {
    beforeAll(async () => {
      // Ensure we have a project
      if (!testProjectId) {
        const projects = await client.get('/projects');
        if (projects.data && projects.data.length > 0) {
          testProjectId = projects.data[0].id;
        }
      }
    });

    it('should get project events', async () => {
      if (!testProjectId) {
        console.log('Skipping: requires project');
        return;
      }

      const result = await client.get(`/projects/${testProjectId}/events`);
      
      expect(result.status).toBe(200);
      expect(result.data).toHaveProperty('events');
      expect(result.data).toHaveProperty('count');
      expect(result.data).toHaveProperty('filters');
      expect(Array.isArray(result.data.events)).toBe(true);
    });

    it('should filter events by machine', async () => {
      if (!testProjectId || !testMachineId) {
        console.log('Skipping: requires project and machine');
        return;
      }

      const result = await client.get(
        `/projects/${testProjectId}/events?machineId=${testMachineId}`
      );
      
      expect(result.status).toBe(200);
      expect(result.data.filters).toHaveProperty('machineId', testMachineId);
    });

    it('should filter events by workspace', async () => {
      if (!testProjectId || !testWorkspaceId) {
        console.log('Skipping: requires project and workspace');
        return;
      }

      const result = await client.get(
        `/projects/${testProjectId}/events?workspaceId=${testWorkspaceId}`
      );
      
      expect(result.status).toBe(200);
      expect(result.data.filters).toHaveProperty('workspaceId', testWorkspaceId);
    });

    it('should filter events by timestamp range', async () => {
      if (!testProjectId) {
        console.log('Skipping: requires project');
        return;
      }

      const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const to = new Date().toISOString();

      const result = await client.get(
        `/projects/${testProjectId}/events?from=${from}&to=${to}`
      );
      
      expect(result.status).toBe(200);
      expect(result.data.filters).toHaveProperty('from');
      expect(result.data.filters).toHaveProperty('to');
    });

    it('should filter events by event type', async () => {
      if (!testProjectId) {
        console.log('Skipping: requires project');
        return;
      }

      const result = await client.get(
        `/projects/${testProjectId}/events?eventType=llm_request`
      );
      
      expect(result.status).toBe(200);
      expect(result.data.filters).toHaveProperty('eventType', 'llm_request');
    });

    it('should filter events by severity', async () => {
      if (!testProjectId) {
        console.log('Skipping: requires project');
        return;
      }

      const result = await client.get(
        `/projects/${testProjectId}/events?severity=error`
      );
      
      expect(result.status).toBe(200);
      expect(result.data.filters).toHaveProperty('severity', 'error');
    });

    it('should respect limit parameter', async () => {
      if (!testProjectId) {
        console.log('Skipping: requires project');
        return;
      }

      const result = await client.get(
        `/projects/${testProjectId}/events?limit=10`
      );
      
      expect(result.status).toBe(200);
      expect(result.data.filters).toHaveProperty('limit', 10);
      expect(result.data.events.length).toBeLessThanOrEqual(10);
    });

    it('should reject invalid severity', async () => {
      if (!testProjectId) {
        console.log('Skipping: requires project');
        return;
      }

      const result = await client.get(
        `/projects/${testProjectId}/events?severity=invalid`,
        400
      );
      
      expect(result.data).toHaveProperty('error');
    });

    it('should reject invalid date format', async () => {
      if (!testProjectId) {
        console.log('Skipping: requires project');
        return;
      }

      const result = await client.get(
        `/projects/${testProjectId}/events?from=invalid-date`,
        400
      );
      
      expect(result.data).toHaveProperty('error');
    });
  });

  describe('Chat Session Endpoints', () => {
    it('should create/upsert a chat session', async () => {
      if (!testWorkspaceId) {
        console.log('Skipping: requires workspace');
        return;
      }

      const sessionData = {
        sessionId: crypto.randomUUID(),
        workspaceId: testWorkspaceId,
        agentType: 'copilot',
        modelId: 'gpt-4',
        startedAt: new Date().toISOString(),
        messageCount: 5,
        totalTokens: 1000,
      };

      const result = await client.post('/chat-sessions', sessionData);
      
      expect(result.status).toBe(200);
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('sessionId', sessionData.sessionId);
      expect(result.data).toHaveProperty('workspaceId', testWorkspaceId);

      testSessionId = sessionData.sessionId;
    });

    it('should reject invalid session data', async () => {
      const invalidData = {
        sessionId: 'not-a-uuid', // Invalid
        workspaceId: 1,
        agentType: 'copilot',
        startedAt: new Date().toISOString(),
      };

      const result = await client.post('/chat-sessions', invalidData, 400);
      expect(result.data).toHaveProperty('error');
    });

    it('should get session events', async () => {
      if (!testSessionId) {
        console.log('Skipping: requires session');
        return;
      }

      const result = await client.get(`/chat-sessions/${testSessionId}/events`);
      
      expect(result.status).toBe(200);
      expect(result.data).toHaveProperty('sessionId', testSessionId);
      expect(result.data).toHaveProperty('events');
      expect(result.data).toHaveProperty('count');
      expect(Array.isArray(result.data.events)).toBe(true);
    });

    it('should reject invalid session UUID', async () => {
      const result = await client.get('/chat-sessions/invalid-uuid/events', 400);
      expect(result.data).toHaveProperty('error');
    });
  });

  describe('Batch Events Endpoint', () => {
    beforeAll(async () => {
      // Ensure we have session for event creation
      if (!testSessionId && testWorkspaceId) {
        const sessionData = {
          sessionId: crypto.randomUUID(),
          workspaceId: testWorkspaceId,
          agentType: 'test',
          startedAt: new Date().toISOString(),
        };
        const result = await client.post('/chat-sessions', sessionData);
        testSessionId = result.data.sessionId;
      }

      // Ensure we have project
      if (!testProjectId) {
        const projects = await client.get('/projects');
        if (projects.data && projects.data.length > 0) {
          testProjectId = projects.data[0].id;
        }
      }
    });

    it('should batch create events', async () => {
      if (!testSessionId || !testProjectId) {
        console.log('Skipping: requires session and project');
        return;
      }

      const events = [
        {
          timestamp: new Date().toISOString(),
          eventType: 'llm_request',
          agentId: 'test-agent',
          agentVersion: '1.0.0',
          sessionId: testSessionId,
          projectId: testProjectId,
          context: {},
          data: { message: 'test' },
        },
        {
          timestamp: new Date().toISOString(),
          eventType: 'llm_response',
          agentId: 'test-agent',
          agentVersion: '1.0.0',
          sessionId: testSessionId,
          projectId: testProjectId,
          context: {},
          data: { response: 'test response' },
        },
      ];

      const result = await client.post('/events/batch', events, 201);
      
      expect(result.status).toBe(201);
      expect(result.data).toHaveProperty('created');
      expect(result.data).toHaveProperty('requested', 2);
      expect(result.data.created).toBeGreaterThan(0);
    });

    it('should reject batch with too many events', async () => {
      const events = Array(1001).fill({
        timestamp: new Date().toISOString(),
        eventType: 'test',
        agentId: 'test',
        agentVersion: '1.0',
        sessionId: crypto.randomUUID(),
        projectId: 1,
      });

      const result = await client.post('/events/batch', events, 400);
      expect(result.data).toHaveProperty('error');
    });

    it('should reject invalid event in batch', async () => {
      const events = [
        {
          timestamp: new Date().toISOString(),
          eventType: 'test',
          agentId: 'test',
          // Missing required fields
        },
      ];

      const result = await client.post('/events/batch', events, 400);
      expect(result.data).toHaveProperty('error');
    });

    it('should reject non-array input', async () => {
      const result = await client.post('/events/batch', { not: 'array' }, 400);
      expect(result.data).toHaveProperty('error');
    });
  });

  describe('Health Check', () => {
    it('should respond to health check', async () => {
      const result = await client.get('/health');
      expect(result.status).toBe(200);
      expect(result.data).toHaveProperty('status', 'ok');
    });
  });

  describe('Error Handling Consistency', () => {
    it('should return consistent error format across endpoints', async () => {
      const endpoints = [
        { path: '/machines/invalid', status: 400 },
        { path: '/machines/999999', status: 404 },
        { path: '/workspaces/non-existent', status: 404 },
        { path: '/projects/invalid/hierarchy', status: 400 },
        { path: '/projects/999999/hierarchy', status: 404 },
      ];

      for (const endpoint of endpoints) {
        const result = await client.get(endpoint.path, endpoint.status);
        expect(result.data).toHaveProperty('error');
        expect(typeof result.data.error).toBe('string');
      }
    });
  });
});
