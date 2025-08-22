/**
 * Tests for ProjectApiClient
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Project } from '@codervisor/devlog-core';

// Mock the ApiClient first
const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

const MockApiError = class extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  is(code: string): boolean {
    return this.code === code;
  }

  isNotFound(): boolean {
    return this.code.endsWith('_NOT_FOUND') || this.status === 404;
  }

  isValidation(): boolean {
    return this.code === 'VALIDATION_FAILED' || this.status === 422;
  }

  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  isServerError(): boolean {
    return this.status >= 500;
  }
};

vi.mock('../../../app/lib/api/api-client', () => ({
  ApiClient: vi.fn(() => mockApiClient),
  ApiError: MockApiError,
}));

// Now import the modules that depend on the mocked modules
import { ProjectApiClient, CreateProjectRequest, UpdateProjectRequest } from '../../../app/lib/api/project-api-client';

// Create a type alias for our mock error class for tests
const ApiError = MockApiError;

describe('ProjectApiClient', () => {
  let projectClient: ProjectApiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    projectClient = new ProjectApiClient();
  });

  describe('list()', () => {
    it('should fetch and return projects list', async () => {
      const mockProjects: Project[] = [
        {
          id: 1,
          name: 'Test Project',
          description: 'A test project',
          createdAt: new Date('2023-01-01'),
          lastAccessedAt: new Date('2023-01-02'),
        },
      ];

      mockApiClient.get.mockResolvedValue(mockProjects);

      const result = await projectClient.list();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/projects');
      expect(result).toEqual(mockProjects);
    });

    it('should handle API errors correctly', async () => {
      const apiError = new ApiError('SERVER_ERROR', 'Server error', 500);
      mockApiClient.get.mockRejectedValue(apiError);

      await expect(projectClient.list()).rejects.toThrow(apiError);
    });

    it('should wrap non-API errors', async () => {
      const genericError = new Error('Network error');
      mockApiClient.get.mockRejectedValue(genericError);

      await expect(projectClient.list()).rejects.toThrow(
        expect.objectContaining({
          code: 'PROJECT_LIST_FAILED',
          message: 'Failed to fetch projects list',
        })
      );
    });
  });

  describe('get()', () => {
    it('should fetch a specific project', async () => {
      const mockProject: Project = {
        id: 1,
        name: 'Test Project',
        description: 'A test project',
        createdAt: new Date('2023-01-01'),
        lastAccessedAt: new Date('2023-01-02'),
      };

      mockApiClient.get.mockResolvedValue(mockProject);

      const result = await projectClient.get('test-project');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/projects/test-project');
      expect(result).toEqual(mockProject);
    });

    it('should validate project name parameter', async () => {
      await expect(projectClient.get('')).rejects.toThrow(
        expect.objectContaining({
          code: 'INVALID_PROJECT_NAME',
          status: 400,
        })
      );

      await expect(projectClient.get(null as any)).rejects.toThrow(
        expect.objectContaining({
          code: 'INVALID_PROJECT_NAME',
          status: 400,
        })
      );
    });

    it('should handle project not found', async () => {
      const notFoundError = new ApiError('PROJECT_NOT_FOUND', 'Not found', 404);
      mockApiClient.get.mockRejectedValue(notFoundError);

      await expect(projectClient.get('nonexistent')).rejects.toThrow(
        expect.objectContaining({
          code: 'PROJECT_NOT_FOUND',
          message: "Project 'nonexistent' not found",
        })
      );
    });

    it('should encode project names in URLs', async () => {
      mockApiClient.get.mockResolvedValue({});

      await projectClient.get('project with spaces');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/projects/project%20with%20spaces');
    });
  });

  describe('create()', () => {
    it('should create a new project', async () => {
      const createData: CreateProjectRequest = {
        name: 'New Project',
        description: 'A new project',
      };

      const mockCreatedProject: Project = {
        id: 2,
        name: 'New Project',
        description: 'A new project',
        createdAt: new Date('2023-01-01'),
        lastAccessedAt: new Date('2023-01-01'),
      };

      mockApiClient.post.mockResolvedValue(mockCreatedProject);

      const result = await projectClient.create(createData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/projects', createData);
      expect(result).toEqual(mockCreatedProject);
    });

    it('should validate create data', async () => {
      await expect(projectClient.create({} as any)).rejects.toThrow(
        expect.objectContaining({
          code: 'INVALID_PROJECT_DATA',
          status: 400,
        })
      );

      await expect(projectClient.create({ name: '' })).rejects.toThrow(
        expect.objectContaining({
          code: 'INVALID_PROJECT_DATA',
          status: 400,
        })
      );
    });

    it('should handle validation errors from API', async () => {
      const validationError = new ApiError('VALIDATION_FAILED', 'Invalid name', 422);
      mockApiClient.post.mockRejectedValue(validationError);

      await expect(projectClient.create({ name: 'Test' })).rejects.toThrow(
        expect.objectContaining({
          code: 'PROJECT_VALIDATION_FAILED',
          status: 422,
        })
      );
    });
  });

  describe('update()', () => {
    it('should update a project', async () => {
      const updateData: UpdateProjectRequest = {
        description: 'Updated description',
      };

      const mockUpdatedProject: Project = {
        id: 1,
        name: 'Test Project',
        description: 'Updated description',
        createdAt: new Date('2023-01-01'),
        lastAccessedAt: new Date('2023-01-02'),
      };

      mockApiClient.put.mockResolvedValue(mockUpdatedProject);

      const result = await projectClient.update('test-project', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/api/projects/test-project', updateData);
      expect(result).toEqual(mockUpdatedProject);
    });

    it('should validate update parameters', async () => {
      await expect(projectClient.update('', {})).rejects.toThrow(
        expect.objectContaining({
          code: 'INVALID_PROJECT_NAME',
          status: 400,
        })
      );

      await expect(projectClient.update('test', {})).rejects.toThrow(
        expect.objectContaining({
          code: 'INVALID_UPDATE_DATA',
          status: 400,
        })
      );
    });
  });

  describe('delete()', () => {
    it('should delete a project', async () => {
      const mockDeleteResponse = { deleted: true, projectId: 1 };
      mockApiClient.delete.mockResolvedValue(mockDeleteResponse);

      const result = await projectClient.delete('test-project');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/projects/test-project');
      expect(result).toEqual(mockDeleteResponse);
    });

    it('should validate project name', async () => {
      await expect(projectClient.delete('')).rejects.toThrow(
        expect.objectContaining({
          code: 'INVALID_PROJECT_NAME',
          status: 400,
        })
      );
    });
  });

  describe('exists()', () => {
    it('should return true when project exists', async () => {
      mockApiClient.get.mockResolvedValue({});

      const result = await projectClient.exists('test-project');

      expect(result).toBe(true);
    });

    it('should return false when project does not exist', async () => {
      const notFoundError = new ApiError('PROJECT_NOT_FOUND', 'Not found', 404);
      mockApiClient.get.mockRejectedValue(notFoundError);

      const result = await projectClient.exists('nonexistent');

      expect(result).toBe(false);
    });

    it('should re-throw non-404 errors', async () => {
      const serverError = new ApiError('SERVER_ERROR', 'Server error', 500);
      mockApiClient.get.mockRejectedValue(serverError);

      await expect(projectClient.exists('test-project')).rejects.toThrow(serverError);
    });
  });
});