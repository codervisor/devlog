/**
 * Tests for HierarchyService
 * Validates workspace resolution, hierarchy building, and upsert operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HierarchyService } from '../hierarchy/hierarchy-service.js';
import type { MachineCreateInput, WorkspaceCreateInput } from '../hierarchy/hierarchy-service.js';
import { TestDataFactory, getTestDatabase } from '@codervisor/test-utils';
import type { PrismaClient } from '@prisma/client';

describe('HierarchyService', () => {
  let service: HierarchyService;
  let factory: TestDataFactory;
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = getTestDatabase();
    factory = new TestDataFactory(prisma);
    service = HierarchyService.getInstance();
  });

  afterEach(async () => {
    await service.dispose();
    // Reset singleton
    (HierarchyService as any).instances = new Map();
  });

  describe('getInstance', () => {
    it('should create a singleton instance', () => {
      const instance1 = HierarchyService.getInstance();
      const instance2 = HierarchyService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('resolveWorkspace', () => {
    it('should resolve workspace to full context', async () => {
      const { project, machine, workspace } = await factory.createCompleteSetup({
        projectData: { fullName: 'owner/test-project' },
        machineData: { hostname: 'test-hostname' },
        workspaceData: { workspaceId: 'test-workspace-uuid' },
      });

      const result = await service.resolveWorkspace('test-workspace-uuid');

      expect(result).toEqual({
        projectId: project.id,
        machineId: machine.id,
        workspaceId: workspace.id,
        projectName: 'owner/test-project',
        machineName: 'test-hostname',
      });
    });

    it('should throw error if workspace not found', async () => {
      await expect(service.resolveWorkspace('non-existent-workspace')).rejects.toThrow(
        'Workspace not found: non-existent-workspace',
      );
    });
  });

  describe('getProjectHierarchy', () => {
    it('should build project hierarchy with machines and workspaces', async () => {
      const project = await factory.createProject({
        fullName: 'owner/test-project',
        description: 'Test project',
      });

      const machine1 = await factory.createMachine({ hostname: 'host1' });
      const machine2 = await factory.createMachine({ hostname: 'host2' });

      const workspace1 = await factory.createWorkspace({
        projectId: project.id,
        machineId: machine1.id,
        workspaceId: 'ws-1',
        branch: 'main',
      });

      const workspace2 = await factory.createWorkspace({
        projectId: project.id,
        machineId: machine2.id,
        workspaceId: 'ws-2',
        branch: 'dev',
      });

      const session1 = await factory.createChatSession({
        workspaceId: workspace1.id,
        agentType: 'copilot',
      });

      const session2 = await factory.createChatSession({
        workspaceId: workspace2.id,
        agentType: 'claude',
      });

      // Create agent events (5 for session1, 3 for session2)
      for (let i = 0; i < 5; i++) {
        await factory.createAgentEvent({
          chatSessionId: session1.sessionId,
          workspaceId: workspace1.id,
        });
      }

      for (let i = 0; i < 3; i++) {
        await factory.createAgentEvent({
          chatSessionId: session2.sessionId,
          workspaceId: workspace2.id,
        });
      }

      const result = await service.getProjectHierarchy(project.id);

      expect(result.project.id).toBe(project.id);
      expect(result.machines).toHaveLength(2);
      const allWorkspaces = [...result.machines[0].workspaces, ...result.machines[1].workspaces];
      const totalEvents = allWorkspaces.reduce((sum, ws) => sum + ws.eventCount, 0);
      expect(totalEvents).toBe(8);
    });

    it('should throw error if project not found', async () => {
      await expect(service.getProjectHierarchy(999)).rejects.toThrow('Project not found: 999');
    });

    it('should handle multiple workspaces on same machine', async () => {
      const project = await factory.createProject({
        fullName: 'owner/test-project',
      });
      const machine = await factory.createMachine({ hostname: 'host1' });

      await factory.createWorkspace({
        projectId: project.id,
        machineId: machine.id,
        workspaceId: 'ws-1',
        branch: 'main',
      });

      await factory.createWorkspace({
        projectId: project.id,
        machineId: machine.id,
        workspaceId: 'ws-2',
        branch: 'dev',
      });

      const result = await service.getProjectHierarchy(project.id);

      expect(result.machines).toHaveLength(1);
      expect(result.machines[0].workspaces).toHaveLength(2);
    });
  });

  describe('upsertMachine', () => {
    it('should create new machine', async () => {
      const machineData: MachineCreateInput = {
        machineId: 'test-machine',
        hostname: 'test-host',
        username: 'testuser',
        osType: 'linux',
        osVersion: '22.04',
        machineType: 'local',
        ipAddress: '192.168.1.1',
        metadata: { key: 'value' },
      };

      const result = await service.upsertMachine(machineData);

      expect(result.machineId).toBe('test-machine');
      expect(result.hostname).toBe('test-host');
      expect(result.username).toBe('testuser');
      expect(result.osType).toBe('linux');
      expect(result.osVersion).toBe('22.04');
      expect(result.machineType).toBe('local');
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(result.metadata).toEqual({ key: 'value' });
    });

    it('should update existing machine on upsert', async () => {
      const machineData: MachineCreateInput = {
        machineId: 'existing-machine',
        hostname: 'test-host',
        username: 'testuser',
        osType: 'linux',
        osVersion: '22.04',
        machineType: 'local',
        ipAddress: '192.168.1.1',
      };

      const initial = await service.upsertMachine(machineData);

      const updated = await service.upsertMachine({
        ...machineData,
        osVersion: '24.04',
        ipAddress: '192.168.1.100',
      });

      expect(updated.id).toBe(initial.id);
      expect(updated.osVersion).toBe('24.04');
      expect(updated.ipAddress).toBe('192.168.1.100');
    });

    it('should handle machine without optional fields', async () => {
      const machineData: MachineCreateInput = {
        machineId: 'minimal-machine',
        hostname: 'minimal-host',
        username: 'user',
        osType: 'linux',
        machineType: 'local',
      };

      const result = await service.upsertMachine(machineData);

      expect(result.machineId).toBe('minimal-machine');
      expect(result.osVersion).toBeNull();
      expect(result.ipAddress).toBeNull();
    });
  });

  describe('upsertWorkspace', () => {
    it('should create new workspace', async () => {
      const { project, machine } = await factory.createCompleteSetup();

      const workspaceData: WorkspaceCreateInput = {
        projectId: project.id,
        machineId: machine.id,
        workspaceId: 'test-ws-uuid',
        workspacePath: '/path/to/workspace',
        workspaceType: 'folder',
        branch: 'main',
        commit: 'abc123',
      };

      const result = await service.upsertWorkspace(workspaceData);

      expect(result.workspaceId).toBe('test-ws-uuid');
      expect(result.projectId).toBe(project.id);
      expect(result.machineId).toBe(machine.id);
      expect(result.branch).toBe('main');
      expect(result.commit).toBe('abc123');
    });

    it('should update existing workspace on upsert', async () => {
      const { project, machine } = await factory.createCompleteSetup();

      const workspaceData: WorkspaceCreateInput = {
        projectId: project.id,
        machineId: machine.id,
        workspaceId: 'existing-ws',
        workspacePath: '/path',
        workspaceType: 'folder',
        branch: 'main',
        commit: 'abc123',
      };

      const initial = await service.upsertWorkspace(workspaceData);

      const updated = await service.upsertWorkspace({
        ...workspaceData,
        branch: 'feature-branch',
        commit: 'xyz789',
      });

      expect(updated.id).toBe(initial.id);
      expect(updated.branch).toBe('feature-branch');
      expect(updated.commit).toBe('xyz789');
    });
  });

  describe('resolveProject', () => {
    it('should normalize and resolve project from git URL', async () => {
      const result = await service.resolveProject('https://github.com/owner/test-repo.git');

      expect(result.name).toBe('test-repo');
      expect(result.fullName).toBe('owner/test-repo');
      expect(result.repoUrl).toBe('https://github.com/owner/test-repo');
      expect(result.repoOwner).toBe('owner');
      expect(result.repoName).toBe('test-repo');
    });

    it('should convert SSH URLs to HTTPS', async () => {
      const result = await service.resolveProject('git@github.com:owner/test-repo.git');

      expect(result.repoUrl).toBe('https://github.com/owner/test-repo');
      expect(result.fullName).toBe('owner/test-repo');
    });

    it('should throw error for invalid GitHub URL', async () => {
      await expect(service.resolveProject('invalid-url')).rejects.toThrow('Invalid GitHub URL');
    });
  });

  describe('getMachine', () => {
    it('should get machine by ID', async () => {
      const machine = await factory.createMachine({ hostname: 'test-host' });

      const result = await service.getMachine(machine.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(machine.id);
      expect(result?.hostname).toBe('test-host');
    });

    it('should return null if machine not found', async () => {
      const result = await service.getMachine(999);

      expect(result).toBeNull();
    });
  });

  describe('listMachines', () => {
    it('should list all machines ordered by last seen', async () => {
      const machine1 = await factory.createMachine({ hostname: 'host1' });
      const machine2 = await factory.createMachine({ hostname: 'host2' });

      const result = await service.listMachines();

      expect(result.length).toBeGreaterThanOrEqual(2);
      const foundMachine1 = result.find((m) => m.id === machine1.id);
      const foundMachine2 = result.find((m) => m.id === machine2.id);
      expect(foundMachine1).toBeDefined();
      expect(foundMachine2).toBeDefined();
    });
  });

  describe('getWorkspace', () => {
    it('should get workspace by VS Code ID', async () => {
      const { workspace } = await factory.createCompleteSetup({
        workspaceData: { workspaceId: 'test-ws-uuid' },
      });

      const result = await service.getWorkspace('test-ws-uuid');

      expect(result).not.toBeNull();
      expect(result?.id).toBe(workspace.id);
      expect(result?.workspaceId).toBe('test-ws-uuid');
    });

    it('should return null if workspace not found', async () => {
      const result = await service.getWorkspace('non-existent');

      expect(result).toBeNull();
    });
  });
});
