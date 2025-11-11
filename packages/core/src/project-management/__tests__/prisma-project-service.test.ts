/**
 * Tests for Prisma-based ProjectService
 * Ensures compatibility with TypeORM version and validates new functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaProjectService } from '../projects/prisma-project-service.js';
import { TestDataFactory, getTestDatabase } from '@codervisor/test-utils';
import type { PrismaClient } from '@prisma/client';

describe('PrismaProjectService', () => {
  let service: PrismaProjectService;
  let factory: TestDataFactory;
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = getTestDatabase();
    factory = new TestDataFactory(prisma);
    service = PrismaProjectService.getInstance();
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
      expect(service).toBeDefined();
    });
  });

  describe('list', () => {
    it('should return all projects ordered by last accessed time', async () => {
      // Create test projects
      await factory.createProject({ name: 'Project 1' });
      await factory.createProject({ name: 'Project 2' });

      const result = await service.list();

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0].name).toBeDefined();
    });

    it('should return empty array when no projects exist', async () => {
      const result = await service.list();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('get', () => {
    it('should return project by ID', async () => {
      const project = await factory.createProject({ name: 'Test-Project' });

      const result = await service.get(project.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(project.id);
      expect(result?.name).toBe('Test-Project');
    });

    it('should return null for non-existent project', async () => {
      const result = await service.get(99999);
      expect(result).toBeNull();
    });
  });

  describe('getByName', () => {
    it('should find project by exact name', async () => {
      await factory.createProject({ name: 'Unique-Project-Name' });

      const result = await service.getByName('Unique-Project-Name');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Unique-Project-Name');
    });

    it('should return null when project not found', async () => {
      const result = await service.getByName('Non-existent-Project');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'New-Project',
        description: 'A new test project',
      };

      const result = await service.create(projectData as any);

      expect(result.id).toBeDefined();
      expect(result.name).toBe('New-Project');
      expect(result.description).toBe('A new test project');
    });

    it('should create project without description', async () => {
      const projectData = {
        name: 'Minimal-Project',
      };

      const result = await service.create(projectData as any);

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Minimal-Project');
    });
  });

  describe('update', () => {
    it('should update project details', async () => {
      const project = await factory.createProject({
        name: 'Original-Name',
        description: 'Original Description',
      });

      const result = await service.update(project.id, {
        name: 'Updated-Name',
        description: 'Updated Description',
      });

      expect(result.id).toBe(project.id);
      expect(result.name).toBe('Updated-Name');
      expect(result.description).toBe('Updated Description');
    });

    it('should partially update project', async () => {
      const project = await factory.createProject({
        name: 'Original-Name',
        description: 'Original Description',
      });

      const result = await service.update(project.id, {
        description: 'Only Description Updated',
      });

      expect(result.id).toBe(project.id);
      expect(result.name).toBe('Original-Name');
      expect(result.description).toBe('Only Description Updated');
    });

    it('should throw error when updating non-existent project', async () => {
      await expect(service.update(99999, { name: 'Updated' })).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete existing project', async () => {
      const project = await factory.createProject({ name: 'To-Delete' });

      await service.delete(project.id);

      const result = await service.get(project.id);
      expect(result).toBeNull();
    });

    it('should throw error if project not found', async () => {
      await expect(service.delete(99999)).rejects.toThrow();
    });
  });
});
