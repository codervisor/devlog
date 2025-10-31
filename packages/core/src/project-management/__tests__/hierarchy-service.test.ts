/**
 * Tests for HierarchyService
 * Validates workspace resolution, hierarchy building, and upsert operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HierarchyService } from '../hierarchy/hierarchy-service.js';
import type {
  WorkspaceContext,
  MachineCreateInput,
  WorkspaceCreateInput,
} from '../hierarchy/hierarchy-service.js';

// Mock Prisma Client
const mockPrismaClient = {
  workspace: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  machine: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  project: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  $queryRaw: vi.fn(),
  $disconnect: vi.fn(),
};

// Mock the prisma config
vi.mock('../../utils/prisma-config.js', () => ({
  getPrismaClient: () => mockPrismaClient,
}));

describe('HierarchyService', () => {
  let service: HierarchyService;

  beforeEach(() => {
    service = HierarchyService.getInstance();
    // Reset all mocks
    vi.clearAllMocks();
    // Mock successful connection test
    mockPrismaClient.$queryRaw.mockResolvedValue([{ 1: 1 }]);
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
      const mockWorkspace = {
        id: 1,
        projectId: 10,
        machineId: 20,
        workspaceId: 'test-workspace-uuid',
        workspacePath: '/path/to/workspace',
        workspaceType: 'folder',
        branch: 'main',
        commit: 'abc123',
        createdAt: new Date(),
        lastSeenAt: new Date(),
        project: {
          id: 10,
          name: 'test-project',
          fullName: 'owner/test-project',
          repoUrl: 'https://github.com/owner/test-project',
          repoOwner: 'owner',
          repoName: 'test-project',
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        machine: {
          id: 20,
          machineId: 'test-machine-id',
          hostname: 'test-hostname',
          username: 'testuser',
          osType: 'linux',
          osVersion: '22.04',
          machineType: 'local',
          ipAddress: '192.168.1.1',
          metadata: {},
          createdAt: new Date(),
          lastSeenAt: new Date(),
        },
      };

      mockPrismaClient.workspace.findUnique.mockResolvedValue(mockWorkspace);

      const result = await service.resolveWorkspace('test-workspace-uuid');

      expect(result).toEqual({
        projectId: 10,
        machineId: 20,
        workspaceId: 1,
        projectName: 'owner/test-project',
        machineName: 'test-hostname',
      });

      expect(mockPrismaClient.workspace.findUnique).toHaveBeenCalledWith({
        where: { workspaceId: 'test-workspace-uuid' },
        include: {
          project: true,
          machine: true,
        },
      });
    });

    it('should throw error if workspace not found', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue(null);

      await expect(
        service.resolveWorkspace('non-existent-workspace')
      ).rejects.toThrow('Workspace not found: non-existent-workspace');
    });
  });

  describe('getProjectHierarchy', () => {
    it('should build project hierarchy with machines and workspaces', async () => {
      const mockProject = {
        id: 1,
        name: 'test-project',
        fullName: 'owner/test-project',
        repoUrl: 'https://github.com/owner/test-project',
        repoOwner: 'owner',
        repoName: 'test-project',
        description: 'Test project',
        createdAt: new Date(),
        updatedAt: new Date(),
        workspaces: [
          {
            id: 1,
            projectId: 1,
            machineId: 1,
            workspaceId: 'ws-1',
            workspacePath: '/path1',
            workspaceType: 'folder',
            branch: 'main',
            commit: 'abc',
            createdAt: new Date(),
            lastSeenAt: new Date(),
            machine: {
              id: 1,
              machineId: 'machine-1',
              hostname: 'host1',
              username: 'user1',
              osType: 'linux',
              osVersion: '22.04',
              machineType: 'local',
              ipAddress: '192.168.1.1',
              metadata: {},
              createdAt: new Date(),
              lastSeenAt: new Date(),
            },
            chatSessions: [
              {
                id: 1,
                sessionId: 'session-1',
                workspaceId: 1,
                agentType: 'copilot',
                modelId: 'gpt-4',
                startedAt: new Date(),
                endedAt: new Date(),
                messageCount: 10,
                totalTokens: 1000,
                createdAt: new Date(),
                _count: {
                  agentEvents: 5,
                },
              },
            ],
          },
          {
            id: 2,
            projectId: 1,
            machineId: 2,
            workspaceId: 'ws-2',
            workspacePath: '/path2',
            workspaceType: 'folder',
            branch: 'dev',
            commit: 'def',
            createdAt: new Date(),
            lastSeenAt: new Date(),
            machine: {
              id: 2,
              machineId: 'machine-2',
              hostname: 'host2',
              username: 'user2',
              osType: 'darwin',
              osVersion: '14.0',
              machineType: 'local',
              ipAddress: '192.168.1.2',
              metadata: {},
              createdAt: new Date(),
              lastSeenAt: new Date(),
            },
            chatSessions: [
              {
                id: 2,
                sessionId: 'session-2',
                workspaceId: 2,
                agentType: 'claude',
                modelId: 'claude-sonnet',
                startedAt: new Date(),
                endedAt: null,
                messageCount: 5,
                totalTokens: 500,
                createdAt: new Date(),
                _count: {
                  agentEvents: 3,
                },
              },
            ],
          },
        ],
      };

      mockPrismaClient.project.findUnique.mockResolvedValue(mockProject);

      const result = await service.getProjectHierarchy(1);

      expect(result.project).toEqual(mockProject);
      expect(result.machines).toHaveLength(2);
      expect(result.machines[0].machine.id).toBe(1);
      expect(result.machines[0].workspaces).toHaveLength(1);
      expect(result.machines[0].workspaces[0].eventCount).toBe(5);
      expect(result.machines[1].machine.id).toBe(2);
      expect(result.machines[1].workspaces).toHaveLength(1);
      expect(result.machines[1].workspaces[0].eventCount).toBe(3);
    });

    it('should throw error if project not found', async () => {
      mockPrismaClient.project.findUnique.mockResolvedValue(null);

      await expect(service.getProjectHierarchy(999)).rejects.toThrow(
        'Project not found: 999'
      );
    });

    it('should handle multiple workspaces on same machine', async () => {
      const mockProject = {
        id: 1,
        name: 'test-project',
        fullName: 'owner/test-project',
        repoUrl: 'https://github.com/owner/test-project',
        repoOwner: 'owner',
        repoName: 'test-project',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        workspaces: [
          {
            id: 1,
            projectId: 1,
            machineId: 1,
            workspaceId: 'ws-1',
            workspacePath: '/path1',
            workspaceType: 'folder',
            branch: 'main',
            commit: 'abc',
            createdAt: new Date(),
            lastSeenAt: new Date(),
            machine: {
              id: 1,
              machineId: 'machine-1',
              hostname: 'host1',
              username: 'user1',
              osType: 'linux',
              osVersion: null,
              machineType: 'local',
              ipAddress: null,
              metadata: {},
              createdAt: new Date(),
              lastSeenAt: new Date(),
            },
            chatSessions: [],
          },
          {
            id: 2,
            projectId: 1,
            machineId: 1, // Same machine
            workspaceId: 'ws-2',
            workspacePath: '/path2',
            workspaceType: 'folder',
            branch: 'dev',
            commit: 'def',
            createdAt: new Date(),
            lastSeenAt: new Date(),
            machine: {
              id: 1,
              machineId: 'machine-1',
              hostname: 'host1',
              username: 'user1',
              osType: 'linux',
              osVersion: null,
              machineType: 'local',
              ipAddress: null,
              metadata: {},
              createdAt: new Date(),
              lastSeenAt: new Date(),
            },
            chatSessions: [],
          },
        ],
      };

      mockPrismaClient.project.findUnique.mockResolvedValue(mockProject);

      const result = await service.getProjectHierarchy(1);

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

      const mockMachine = {
        id: 1,
        ...machineData,
        metadata: { key: 'value' },
        createdAt: new Date(),
        lastSeenAt: new Date(),
      };

      mockPrismaClient.machine.upsert.mockResolvedValue(mockMachine);

      const result = await service.upsertMachine(machineData);

      expect(result).toEqual(mockMachine);
      expect(mockPrismaClient.machine.upsert).toHaveBeenCalledWith({
        where: { machineId: 'test-machine' },
        create: expect.objectContaining({
          machineId: 'test-machine',
          hostname: 'test-host',
          username: 'testuser',
          osType: 'linux',
          osVersion: '22.04',
          machineType: 'local',
          ipAddress: '192.168.1.1',
          metadata: { key: 'value' },
        }),
        update: expect.objectContaining({
          lastSeenAt: expect.any(Date),
          osVersion: '22.04',
          ipAddress: '192.168.1.1',
          metadata: { key: 'value' },
        }),
      });
    });

    it('should update existing machine on upsert', async () => {
      const machineData: MachineCreateInput = {
        machineId: 'existing-machine',
        hostname: 'test-host',
        username: 'testuser',
        osType: 'linux',
        osVersion: '24.04', // Updated version
        machineType: 'local',
        ipAddress: '192.168.1.100', // Updated IP
      };

      const mockMachine = {
        id: 5,
        ...machineData,
        metadata: {},
        createdAt: new Date('2023-01-01'),
        lastSeenAt: new Date(),
      };

      mockPrismaClient.machine.upsert.mockResolvedValue(mockMachine);

      const result = await service.upsertMachine(machineData);

      expect(result).toEqual(mockMachine);
      expect(mockPrismaClient.machine.upsert).toHaveBeenCalled();
    });

    it('should handle machine without optional fields', async () => {
      const machineData: MachineCreateInput = {
        machineId: 'minimal-machine',
        hostname: 'minimal-host',
        username: 'user',
        osType: 'linux',
        machineType: 'local',
      };

      const mockMachine = {
        id: 1,
        ...machineData,
        osVersion: null,
        ipAddress: null,
        metadata: {},
        createdAt: new Date(),
        lastSeenAt: new Date(),
      };

      mockPrismaClient.machine.upsert.mockResolvedValue(mockMachine);

      const result = await service.upsertMachine(machineData);

      expect(result).toEqual(mockMachine);
    });
  });

  describe('upsertWorkspace', () => {
    it('should create new workspace', async () => {
      const workspaceData: WorkspaceCreateInput = {
        projectId: 1,
        machineId: 1,
        workspaceId: 'test-ws-uuid',
        workspacePath: '/path/to/workspace',
        workspaceType: 'folder',
        branch: 'main',
        commit: 'abc123',
      };

      const mockWorkspace = {
        id: 1,
        ...workspaceData,
        createdAt: new Date(),
        lastSeenAt: new Date(),
      };

      mockPrismaClient.workspace.upsert.mockResolvedValue(mockWorkspace);

      const result = await service.upsertWorkspace(workspaceData);

      expect(result).toEqual(mockWorkspace);
      expect(mockPrismaClient.workspace.upsert).toHaveBeenCalledWith({
        where: { workspaceId: 'test-ws-uuid' },
        create: expect.objectContaining(workspaceData),
        update: expect.objectContaining({
          lastSeenAt: expect.any(Date),
          branch: 'main',
          commit: 'abc123',
        }),
      });
    });

    it('should update existing workspace on upsert', async () => {
      const workspaceData: WorkspaceCreateInput = {
        projectId: 1,
        machineId: 1,
        workspaceId: 'existing-ws',
        workspacePath: '/path',
        workspaceType: 'folder',
        branch: 'feature-branch', // Updated branch
        commit: 'xyz789', // Updated commit
      };

      const mockWorkspace = {
        id: 5,
        ...workspaceData,
        createdAt: new Date('2023-01-01'),
        lastSeenAt: new Date(),
      };

      mockPrismaClient.workspace.upsert.mockResolvedValue(mockWorkspace);

      const result = await service.upsertWorkspace(workspaceData);

      expect(result).toEqual(mockWorkspace);
    });
  });

  describe('resolveProject', () => {
    it('should normalize and resolve project from git URL', async () => {
      const mockProject = {
        id: 1,
        name: 'test-repo',
        fullName: 'owner/test-repo',
        repoUrl: 'https://github.com/owner/test-repo',
        repoOwner: 'owner',
        repoName: 'test-repo',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.project.upsert.mockResolvedValue(mockProject);

      const result = await service.resolveProject(
        'https://github.com/owner/test-repo.git'
      );

      expect(result).toEqual(mockProject);
      expect(mockPrismaClient.project.upsert).toHaveBeenCalledWith({
        where: { repoUrl: 'https://github.com/owner/test-repo' },
        create: {
          name: 'test-repo',
          fullName: 'owner/test-repo',
          repoUrl: 'https://github.com/owner/test-repo',
          repoOwner: 'owner',
          repoName: 'test-repo',
        },
        update: {
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should convert SSH URLs to HTTPS', async () => {
      const mockProject = {
        id: 1,
        name: 'test-repo',
        fullName: 'owner/test-repo',
        repoUrl: 'https://github.com/owner/test-repo',
        repoOwner: 'owner',
        repoName: 'test-repo',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.project.upsert.mockResolvedValue(mockProject);

      const result = await service.resolveProject(
        'git@github.com:owner/test-repo.git'
      );

      expect(result).toEqual(mockProject);
      expect(mockPrismaClient.project.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { repoUrl: 'https://github.com/owner/test-repo' },
        })
      );
    });

    it('should throw error for invalid GitHub URL', async () => {
      await expect(
        service.resolveProject('invalid-url')
      ).rejects.toThrow('Invalid GitHub URL');
    });
  });

  describe('getMachine', () => {
    it('should get machine by ID', async () => {
      const mockMachine = {
        id: 1,
        machineId: 'test-machine',
        hostname: 'test-host',
        username: 'testuser',
        osType: 'linux',
        osVersion: '22.04',
        machineType: 'local',
        ipAddress: '192.168.1.1',
        metadata: {},
        createdAt: new Date(),
        lastSeenAt: new Date(),
      };

      mockPrismaClient.machine.findUnique.mockResolvedValue(mockMachine);

      const result = await service.getMachine(1);

      expect(result).toEqual(mockMachine);
      expect(mockPrismaClient.machine.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should return null if machine not found', async () => {
      mockPrismaClient.machine.findUnique.mockResolvedValue(null);

      const result = await service.getMachine(999);

      expect(result).toBeNull();
    });
  });

  describe('listMachines', () => {
    it('should list all machines ordered by last seen', async () => {
      const mockMachines = [
        {
          id: 1,
          machineId: 'machine-1',
          hostname: 'host1',
          username: 'user1',
          osType: 'linux',
          osVersion: '22.04',
          machineType: 'local',
          ipAddress: null,
          metadata: {},
          createdAt: new Date(),
          lastSeenAt: new Date('2024-01-02'),
        },
        {
          id: 2,
          machineId: 'machine-2',
          hostname: 'host2',
          username: 'user2',
          osType: 'darwin',
          osVersion: '14.0',
          machineType: 'local',
          ipAddress: null,
          metadata: {},
          createdAt: new Date(),
          lastSeenAt: new Date('2024-01-01'),
        },
      ];

      mockPrismaClient.machine.findMany.mockResolvedValue(mockMachines);

      const result = await service.listMachines();

      expect(result).toEqual(mockMachines);
      expect(mockPrismaClient.machine.findMany).toHaveBeenCalledWith({
        orderBy: { lastSeenAt: 'desc' },
      });
    });
  });

  describe('getWorkspace', () => {
    it('should get workspace by VS Code ID', async () => {
      const mockWorkspace = {
        id: 1,
        projectId: 1,
        machineId: 1,
        workspaceId: 'test-ws-uuid',
        workspacePath: '/path',
        workspaceType: 'folder',
        branch: 'main',
        commit: 'abc',
        createdAt: new Date(),
        lastSeenAt: new Date(),
      };

      mockPrismaClient.workspace.findUnique.mockResolvedValue(mockWorkspace);

      const result = await service.getWorkspace('test-ws-uuid');

      expect(result).toEqual(mockWorkspace);
      expect(mockPrismaClient.workspace.findUnique).toHaveBeenCalledWith({
        where: { workspaceId: 'test-ws-uuid' },
      });
    });

    it('should return null if workspace not found', async () => {
      mockPrismaClient.workspace.findUnique.mockResolvedValue(null);

      const result = await service.getWorkspace('non-existent');

      expect(result).toBeNull();
    });
  });
});
