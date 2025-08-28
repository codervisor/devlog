/**
 * Tests for Prisma-based ProjectService
 * Ensures compatibility with TypeORM version and validates new functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaProjectService } from '../prisma-project-service.js';
import type { Project } from '../../types/project.js';

// Mock Prisma Client
const mockPrismaClient = {
  project: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  $queryRaw: vi.fn(),
  $disconnect: vi.fn(),
};

// Mock the prisma config
vi.mock('../../utils/prisma-config.js', () => ({
  getPrismaClient: () => mockPrismaClient,
}));

// Mock the validator
vi.mock('../../validation/project-schemas.js', () => ({
  ProjectValidator: {
    validate: vi.fn(() => ({ success: true })),
  },
}));

describe('PrismaProjectService', () => {
  let service: PrismaProjectService;

  beforeEach(() => {
    service = PrismaProjectService.getInstance();
    // Reset all mocks
    vi.clearAllMocks();
    // Mock successful connection test
    mockPrismaClient.$queryRaw.mockResolvedValue([{ 1: 1 }]);
  });

  afterEach(async () => {
    await service.dispose();
    // Reset singleton
    (PrismaProjectService as any).instance = null;
  });

  describe('getInstance', () => {
    it('should create a singleton instance', () => {
      const instance1 = PrismaProjectService.getInstance();
      const instance2 = PrismaProjectService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialization', () => {
    it('should initialize database connection', async () => {
      await service.initialize();
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledWith(expect.arrayContaining(['SELECT 1']));
    });

    it('should handle initialization errors', async () => {
      mockPrismaClient.$queryRaw.mockRejectedValue(new Error('Connection failed'));
      await expect(service.initialize()).rejects.toThrow('Connection failed');
    });
  });

  describe('list', () => {
    it('should return all projects ordered by last accessed time', async () => {
      const mockProjects = [
        {
          id: 1,
          name: 'Test Project 1',
          description: 'Test Description 1',
          createdAt: new Date('2023-01-01'),
          lastAccessedAt: new Date('2023-01-02'),
        },
        {
          id: 2,
          name: 'Test Project 2',
          description: 'Test Description 2',
          createdAt: new Date('2023-01-01'),
          lastAccessedAt: new Date('2023-01-01'),
        },
      ];

      mockPrismaClient.project.findMany.mockResolvedValue(mockProjects);

      const result = await service.list();

      expect(mockPrismaClient.project.findMany).toHaveBeenCalledWith({
        orderBy: {
          lastAccessedAt: 'desc',
        },
      });
      expect(result).toEqual(mockProjects);
    });
  });

  describe('get', () => {
    it('should return project by ID and update last accessed time', async () => {
      const mockProject = {
        id: 1,
        name: 'Test Project',
        description: 'Test Description',
        createdAt: new Date('2023-01-01'),
        lastAccessedAt: new Date('2023-01-01'),
      };

      mockPrismaClient.project.findUnique.mockResolvedValue(mockProject);
      mockPrismaClient.project.update.mockResolvedValue({
        ...mockProject,
        lastAccessedAt: new Date(),
      });

      const result = await service.get(1);

      expect(mockPrismaClient.project.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrismaClient.project.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { lastAccessedAt: expect.any(Date) },
      });
      expect(result).toEqual(mockProject);
    });

    it('should return null if project not found', async () => {
      mockPrismaClient.project.findUnique.mockResolvedValue(null);

      const result = await service.get(999);

      expect(result).toBeNull();
      expect(mockPrismaClient.project.update).not.toHaveBeenCalled();
    });
  });

  describe('getByName', () => {
    it('should return project by name (case-insensitive) and update last accessed time', async () => {
      const mockProject = {
        id: 1,
        name: 'Test Project',
        description: 'Test Description',
        createdAt: new Date('2023-01-01'),
        lastAccessedAt: new Date('2023-01-01'),
      };

      mockPrismaClient.project.findFirst.mockResolvedValue(mockProject);
      mockPrismaClient.project.update.mockResolvedValue({
        ...mockProject,
        lastAccessedAt: new Date(),
      });

      const result = await service.getByName('test project');

      expect(mockPrismaClient.project.findFirst).toHaveBeenCalledWith({
        where: {
          name: {
            equals: 'test project',
            mode: 'insensitive',
          },
        },
      });
      expect(result).toEqual(mockProject);
    });

    it('should fallback to exact match for databases without case-insensitive support', async () => {
      const mockProject = {
        id: 1,
        name: 'Test Project',
        description: 'Test Description',
        createdAt: new Date('2023-01-01'),
        lastAccessedAt: new Date('2023-01-01'),
      };

      // First call with case-insensitive fails
      mockPrismaClient.project.findFirst
        .mockRejectedValueOnce(new Error('Case insensitive not supported'))
        .mockResolvedValue(mockProject);

      mockPrismaClient.project.update.mockResolvedValue({
        ...mockProject,
        lastAccessedAt: new Date(),
      });

      const result = await service.getByName('Test Project');

      expect(mockPrismaClient.project.findFirst).toHaveBeenCalledTimes(2);
      expect(mockPrismaClient.project.findFirst).toHaveBeenLastCalledWith({
        where: { name: 'Test Project' },
      });
      expect(result).toEqual(mockProject);
    });

    it('should return null if project not found', async () => {
      mockPrismaClient.project.findFirst.mockResolvedValue(null);

      const result = await service.getByName('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'New Project',
        description: 'New Description',
      };

      const mockCreatedProject = {
        id: 1,
        ...projectData,
        createdAt: new Date('2023-01-01'),
        lastAccessedAt: new Date('2023-01-01'),
      };

      mockPrismaClient.project.create.mockResolvedValue(mockCreatedProject);

      const result = await service.create(projectData);

      expect(mockPrismaClient.project.create).toHaveBeenCalledWith({
        data: {
          name: projectData.name,
          description: projectData.description,
          lastAccessedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(mockCreatedProject);
    });

    it('should throw error for invalid project data', async () => {
      const { ProjectValidator } = await import('../../validation/project-schemas.js');
      vi.mocked(ProjectValidator.validate).mockReturnValue({
        success: false,
        error: {
          issues: [{ message: 'Name is required' }],
        },
      } as any);

      await expect(service.create({ name: '', description: '' })).rejects.toThrow(
        'Invalid project data: Name is required'
      );
    });
  });

  describe('update', () => {
    it('should update existing project', async () => {
      const existingProject = {
        id: 1,
        name: 'Old Name',
        description: 'Old Description',
        createdAt: new Date('2023-01-01'),
        lastAccessedAt: new Date('2023-01-01'),
      };

      const updates = {
        name: 'New Name',
        description: 'New Description',
      };

      const updatedProject = {
        ...existingProject,
        ...updates,
        lastAccessedAt: new Date(),
      };

      // Ensure validation passes
      const { ProjectValidator } = await import('../../validation/project-schemas.js');
      vi.mocked(ProjectValidator.validate).mockReturnValue({ success: true } as any);

      mockPrismaClient.project.findUnique.mockResolvedValue(existingProject);
      mockPrismaClient.project.update.mockResolvedValue(updatedProject);

      const result = await service.update(1, updates);

      expect(mockPrismaClient.project.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: updates.name,
          description: updates.description,
          lastAccessedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(updatedProject);
    });

    it('should throw error if project not found', async () => {
      mockPrismaClient.project.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { name: 'New Name' })).rejects.toThrow(
        'Project with ID 999 not found'
      );
    });

    it('should validate updates', async () => {
      const existingProject = {
        id: 1,
        name: 'Old Name',
        description: 'Old Description',
        createdAt: new Date('2023-01-01'),
        lastAccessedAt: new Date('2023-01-01'),
      };

      mockPrismaClient.project.findUnique.mockResolvedValue(existingProject);

      const { ProjectValidator } = await import('../../validation/project-schemas.js');
      vi.mocked(ProjectValidator.validate).mockReturnValue({
        success: false,
        error: {
          issues: [{ message: 'Invalid name' }],
        },
      } as any);

      await expect(service.update(1, { name: '' })).rejects.toThrow(
        'Invalid project data: Invalid name'
      );
    });
  });

  describe('delete', () => {
    it('should delete existing project', async () => {
      const existingProject = {
        id: 1,
        name: 'Test Project',
        description: 'Test Description',
        createdAt: new Date('2023-01-01'),
        lastAccessedAt: new Date('2023-01-01'),
      };

      mockPrismaClient.project.findUnique.mockResolvedValue(existingProject);
      mockPrismaClient.project.delete.mockResolvedValue(existingProject);

      await service.delete(1);

      expect(mockPrismaClient.project.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw error if project not found', async () => {
      mockPrismaClient.project.findUnique.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(
        'Project with ID 999 not found'
      );
    });
  });
});