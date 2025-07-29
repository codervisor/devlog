/**
 * API Test Suite for Devlog Web API
 *
 * Isolated unit tests using mocks to avoid hitting actual database or services.
 * Tests parameter validation, error handling, and service integration patterns.
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  RouteParams,
  ServiceHelper,
  ApiErrors,
  ApiResponses,
  withErrorHandling,
} from '@/lib/api-utils';

// Mock the devlog-core services
const mockProjectService = {
  getInstance: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockDevlogService = {
  getInstance: vi.fn(),
  get: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
  search: vi.fn(),
  getStats: vi.fn(),
  getTimeSeriesStats: vi.fn(),
  getNextId: vi.fn(),
};

// Mock the core module
vi.mock('@codervisor/devlog-core', () => ({
  ProjectService: mockProjectService,
  DevlogService: mockDevlogService,
}));

describe('API Utilities Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RouteParams', () => {
    describe('parseProjectId', () => {
      it('should parse valid numeric project ID', () => {
        const params = { id: '123' };
        const result = RouteParams.parseProjectId(params);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.projectId).toBe(123);
        }
      });

      it('should reject invalid project ID', () => {
        const params = { id: 'invalid' };
        const result = RouteParams.parseProjectId(params);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.response).toBeInstanceOf(NextResponse);
        }
      });

      it('should reject negative project ID', () => {
        const params = { id: '-1' };
        const result = RouteParams.parseProjectId(params);

        expect(result.success).toBe(false);
      });

      it('should reject zero as project ID', () => {
        const params = { id: '0' };
        const result = RouteParams.parseProjectId(params);

        expect(result.success).toBe(false);
      });

      it('should accept floating point numbers (parsed as integers)', () => {
        const params = { id: '123.45' };
        const result = RouteParams.parseProjectId(params);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.projectId).toBe(123); // parseInt truncates to 123
        }
      });
    });

    describe('parseProjectAndDevlogId', () => {
      it('should parse valid numeric IDs', () => {
        const params = { id: '123', devlogId: '456' };
        const result = RouteParams.parseProjectAndDevlogId(params);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.projectId).toBe(123);
          expect(result.data.devlogId).toBe(456);
        }
      });

      it('should reject invalid project ID', () => {
        const params = { id: 'invalid', devlogId: '456' };
        const result = RouteParams.parseProjectAndDevlogId(params);

        expect(result.success).toBe(false);
      });

      it('should reject invalid devlog ID', () => {
        const params = { id: '123', devlogId: 'invalid' };
        const result = RouteParams.parseProjectAndDevlogId(params);

        expect(result.success).toBe(false);
      });

      it('should provide descriptive error messages', async () => {
        const params = { id: 'invalid', devlogId: '456' };
        const result = RouteParams.parseProjectAndDevlogId(params);

        expect(result.success).toBe(false);
        if (!result.success) {
          const responseJson = await result.response.json();
          expect(responseJson.error).toContain('Invalid project ID: must be a positive integer');
        }
      });
    });
  });

  describe('ServiceHelper', () => {
    describe('getProjectOrFail', () => {
      it('should return project when it exists', async () => {
        const mockProject = { id: 1, name: 'Test Project' };
        mockProjectService.getInstance.mockReturnValue(mockProjectService);
        mockProjectService.get.mockResolvedValue(mockProject);

        const result = await ServiceHelper.getProjectOrFail(1);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.project).toEqual(mockProject);
          expect(result.data.projectService).toBe(mockProjectService);
        }
        expect(mockProjectService.get).toHaveBeenCalledWith(1);
      });

      it('should return error when project does not exist', async () => {
        mockProjectService.getInstance.mockReturnValue(mockProjectService);
        mockProjectService.get.mockResolvedValue(null);

        const result = await ServiceHelper.getProjectOrFail(999);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.response).toBeInstanceOf(NextResponse);
        }
      });

      it('should handle service initialization errors', async () => {
        mockProjectService.getInstance.mockReturnValue(mockProjectService);
        mockProjectService.get.mockRejectedValue(new Error('Database connection failed'));

        await expect(ServiceHelper.getProjectOrFail(1)).rejects.toThrow(
          'Database connection failed',
        );
      });
    });

    describe('getDevlogService', () => {
      it('should return initialized devlog service', async () => {
        mockDevlogService.getInstance.mockReturnValue(mockDevlogService);

        const result = await ServiceHelper.getDevlogService(1);

        expect(result).toBe(mockDevlogService);
        expect(mockDevlogService.getInstance).toHaveBeenCalledWith(1);
      });
    });

    describe('getDevlogOrFail', () => {
      it('should return devlog when it exists', async () => {
        const mockDevlog = { id: 300, title: 'Test Devlog', projectId: 1 };
        mockDevlogService.getInstance.mockReturnValue(mockDevlogService);
        mockDevlogService.get.mockResolvedValue(mockDevlog);

        const result = await ServiceHelper.getDevlogOrFail(1, 300);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.entry).toEqual(mockDevlog);
          expect(result.data.devlogService).toBe(mockDevlogService);
        }
      });

      it('should return error when devlog does not exist', async () => {
        mockDevlogService.getInstance.mockReturnValue(mockDevlogService);
        mockDevlogService.get.mockResolvedValue(null);

        const result = await ServiceHelper.getDevlogOrFail(1, 999);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.response).toBeInstanceOf(NextResponse);
        }
      });
    });
  });

  describe('ApiErrors', () => {
    it('should create consistent error responses', async () => {
      const errors = [
        ApiErrors.projectNotFound(),
        ApiErrors.devlogNotFound(),
        ApiErrors.invalidRequest('Test message'),
        ApiErrors.internalError('Test error'),
        ApiErrors.forbidden(),
        ApiErrors.unauthorized(),
      ];

      for (const error of errors) {
        expect(error).toBeInstanceOf(NextResponse);
        const json = await error.json();
        expect(json).toHaveProperty('error');
        expect(typeof json.error).toBe('string');
      }
    });

    it('should have correct HTTP status codes', () => {
      expect(ApiErrors.projectNotFound().status).toBe(404);
      expect(ApiErrors.devlogNotFound().status).toBe(404);
      expect(ApiErrors.invalidRequest('test').status).toBe(400);
      expect(ApiErrors.internalError().status).toBe(500);
      expect(ApiErrors.forbidden().status).toBe(403);
      expect(ApiErrors.unauthorized().status).toBe(401);
    });

    it('should include custom messages', async () => {
      const customMessage = 'Custom error message';
      const error = ApiErrors.invalidRequest(customMessage);
      const json = await error.json();
      expect(json.error).toBe(customMessage);
    });
  });

  describe('ApiResponses', () => {
    it('should create success responses', async () => {
      const successResponse = ApiResponses.success();
      expect(successResponse).toBeInstanceOf(NextResponse);
      expect(successResponse.status).toBe(200);

      const json = await successResponse.json();
      expect(json).toEqual({ success: true });
    });

    it('should create success responses with data', async () => {
      const testData = { id: 1, name: 'test' };
      const response = ApiResponses.success(testData);
      const json = await response.json();
      expect(json).toEqual(testData);
    });

    it('should create created responses', () => {
      const testData = { id: 1, name: 'created' };
      const response = ApiResponses.created(testData);
      expect(response.status).toBe(201);
    });

    it('should create no content responses', () => {
      const response = ApiResponses.noContent();
      expect(response.status).toBe(204);
    });
  });

  describe('withErrorHandling', () => {
    it('should pass through successful responses', async () => {
      const mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const wrappedHandler = withErrorHandling(mockHandler);

      const result = await wrappedHandler('arg1', 'arg2');

      expect(mockHandler).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBeInstanceOf(NextResponse);
      const json = await result.json();
      expect(json).toEqual({ success: true });
    });

    it('should catch and handle thrown errors', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error('Test error'));
      const wrappedHandler = withErrorHandling(mockHandler);

      const result = await wrappedHandler();

      expect(result).toBeInstanceOf(NextResponse);
      expect(result.status).toBe(500);
      const json = await result.json();
      expect(json.error).toBe('Test error');
    });

    it('should handle "not found" errors specifically', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error('Resource not found'));
      const wrappedHandler = withErrorHandling(mockHandler);

      const result = await wrappedHandler();

      expect(result.status).toBe(404);
      const json = await result.json();
      expect(json.error).toBe('Resource not found');
    });

    it('should handle "Invalid" errors as bad requests', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error('Invalid input provided'));
      const wrappedHandler = withErrorHandling(mockHandler);

      const result = await wrappedHandler();

      expect(result.status).toBe(400);
      const json = await result.json();
      expect(json.error).toBe('Invalid input provided');
    });

    it('should handle non-Error objects', async () => {
      const mockHandler = vi.fn().mockRejectedValue('String error');
      const wrappedHandler = withErrorHandling(mockHandler);

      const result = await wrappedHandler();

      expect(result.status).toBe(500);
      const json = await result.json();
      expect(json.error).toBe('Internal server error');
    });
  });
});

describe('Route Handler Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Project Route Patterns', () => {
    it('should handle valid project GET request', async () => {
      const mockProject = { id: 1, name: 'Test Project', createdAt: '2025-07-29T00:00:00Z' };
      mockProjectService.getInstance.mockReturnValue(mockProjectService);
      mockProjectService.get.mockResolvedValue(mockProject);

      // Simulate route handler pattern
      const handler = withErrorHandling(
        async (request: NextRequest, { params }: { params: { id: string } }) => {
          const paramResult = RouteParams.parseProjectId(params);
          if (!paramResult.success) return paramResult.response;

          const projectResult = await ServiceHelper.getProjectOrFail(paramResult.data.projectId);
          if (!projectResult.success) return projectResult.response;

          return NextResponse.json(projectResult.data.project);
        },
      );

      const mockRequest = new NextRequest('http://localhost/api/projects/1');
      const result = await handler(mockRequest, { params: { id: '1' } });

      expect(result.status).toBe(200);
      const json = await result.json();
      expect(json).toEqual(mockProject);
    });

    it('should handle invalid project ID in GET request', async () => {
      const handler = withErrorHandling(
        async (request: NextRequest, { params }: { params: { id: string } }) => {
          const paramResult = RouteParams.parseProjectId(params);
          if (!paramResult.success) return paramResult.response;

          return NextResponse.json({ success: true });
        },
      );

      const mockRequest = new NextRequest('http://localhost/api/projects/invalid');
      const result = await handler(mockRequest, { params: { id: 'invalid' } });

      expect(result.status).toBe(400);
      const json = await result.json();
      expect(json.error).toContain('Invalid project ID: must be a positive integer');
    });

    it('should handle nonexistent project', async () => {
      mockProjectService.getInstance.mockReturnValue(mockProjectService);
      mockProjectService.get.mockResolvedValue(null);

      const handler = withErrorHandling(
        async (request: NextRequest, { params }: { params: { id: string } }) => {
          const paramResult = RouteParams.parseProjectId(params);
          if (!paramResult.success) return paramResult.response;

          const projectResult = await ServiceHelper.getProjectOrFail(paramResult.data.projectId);
          if (!projectResult.success) return projectResult.response;

          return NextResponse.json(projectResult.data.project);
        },
      );

      const mockRequest = new NextRequest('http://localhost/api/projects/999');
      const result = await handler(mockRequest, { params: { id: '999' } });

      expect(result.status).toBe(404);
      const json = await result.json();
      expect(json.error).toBe('Project not found');
    });
  });

  describe('Devlog Route Patterns', () => {
    it('should handle valid devlog GET request', async () => {
      const mockProject = { id: 1, name: 'Test Project' };
      const mockDevlog = { id: 300, title: 'Test Devlog', projectId: 1 };

      mockProjectService.getInstance.mockReturnValue(mockProjectService);
      mockProjectService.get.mockResolvedValue(mockProject);
      mockDevlogService.getInstance.mockReturnValue(mockDevlogService);
      mockDevlogService.get.mockResolvedValue(mockDevlog);

      const handler = withErrorHandling(
        async (request: NextRequest, { params }: { params: { id: string; devlogId: string } }) => {
          const paramResult = RouteParams.parseProjectAndDevlogId(params);
          if (!paramResult.success) return paramResult.response;

          const projectResult = await ServiceHelper.getProjectOrFail(paramResult.data.projectId);
          if (!projectResult.success) return projectResult.response;

          const devlogResult = await ServiceHelper.getDevlogOrFail(
            paramResult.data.projectId,
            paramResult.data.devlogId,
          );
          if (!devlogResult.success) return devlogResult.response;

          return NextResponse.json(devlogResult.data.entry);
        },
      );

      const mockRequest = new NextRequest('http://localhost/api/projects/1/devlogs/300');
      const result = await handler(mockRequest, { params: { id: '1', devlogId: '300' } });

      expect(result.status).toBe(200);
      const json = await result.json();
      expect(json).toEqual(mockDevlog);
    });

    it('should handle invalid devlog ID', async () => {
      const handler = withErrorHandling(
        async (request: NextRequest, { params }: { params: { id: string; devlogId: string } }) => {
          const paramResult = RouteParams.parseProjectAndDevlogId(params);
          if (!paramResult.success) return paramResult.response;

          return NextResponse.json({ success: true });
        },
      );

      const mockRequest = new NextRequest('http://localhost/api/projects/1/devlogs/invalid');
      const result = await handler(mockRequest, { params: { id: '1', devlogId: 'invalid' } });

      expect(result.status).toBe(400);
      const json = await result.json();
      expect(json.error).toContain('Invalid devlog ID: must be a positive integer');
    });
  });

  describe('Batch Operation Patterns', () => {
    it('should handle valid batch update request', async () => {
      const mockProject = { id: 1, name: 'Test Project' };
      const mockDevlog1 = { id: 100, title: 'Devlog 1', projectId: 1, priority: 'low' };
      const mockDevlog2 = { id: 101, title: 'Devlog 2', projectId: 1, priority: 'low' };

      mockProjectService.getInstance.mockReturnValue(mockProjectService);
      mockProjectService.get.mockResolvedValue(mockProject);
      mockDevlogService.getInstance.mockReturnValue(mockDevlogService);
      mockDevlogService.get.mockResolvedValueOnce(mockDevlog1).mockResolvedValueOnce(mockDevlog2);
      mockDevlogService.save.mockResolvedValue(undefined);

      const handler = withErrorHandling(
        async (request: NextRequest, { params }: { params: { id: string } }) => {
          const paramResult = RouteParams.parseProjectId(params);
          if (!paramResult.success) return paramResult.response;

          const projectResult = await ServiceHelper.getProjectOrFail(paramResult.data.projectId);
          if (!projectResult.success) return projectResult.response;

          const { ids, updates } = await request.json();

          if (!Array.isArray(ids) || !updates) {
            return ApiErrors.invalidRequest('ids (array) and updates (object) are required');
          }

          const devlogService = await ServiceHelper.getDevlogService(paramResult.data.projectId);
          const updatedEntries = [];

          for (const id of ids) {
            const devlogId = parseInt(id);
            if (isNaN(devlogId)) continue;

            const existingEntry = await devlogService.get(devlogId);
            if (!existingEntry) continue;

            const updatedEntry = {
              ...existingEntry,
              ...updates,
              updatedAt: new Date().toISOString(),
            };
            await devlogService.save(updatedEntry);
            updatedEntries.push(updatedEntry);
          }

          return NextResponse.json({ success: true, updated: updatedEntries });
        },
      );

      const requestBody = JSON.stringify({ ids: [100, 101], updates: { priority: 'high' } });
      const mockRequest = new NextRequest('http://localhost/api/projects/1/devlogs/batch/update', {
        method: 'POST',
        body: requestBody,
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await handler(mockRequest, { params: { id: '1' } });

      expect(result.status).toBe(200);
      const json = await result.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.updated)).toBe(true);
      expect(json.updated).toHaveLength(2);
    });

    it('should handle invalid batch request body', async () => {
      const mockProject = { id: 1, name: 'Test Project' };
      mockProjectService.getInstance.mockReturnValue(mockProjectService);
      mockProjectService.get.mockResolvedValue(mockProject);

      const handler = withErrorHandling(
        async (request: NextRequest, { params }: { params: { id: string } }) => {
          const paramResult = RouteParams.parseProjectId(params);
          if (!paramResult.success) return paramResult.response;

          const projectResult = await ServiceHelper.getProjectOrFail(paramResult.data.projectId);
          if (!projectResult.success) return projectResult.response;

          const { ids, updates } = await request.json();

          if (!Array.isArray(ids) || !updates) {
            return ApiErrors.invalidRequest('ids (array) and updates (object) are required');
          }

          return NextResponse.json({ success: true });
        },
      );

      const requestBody = JSON.stringify({ ids: 'not-an-array', updates: { priority: 'high' } });
      const mockRequest = new NextRequest('http://localhost/api/projects/1/devlogs/batch/update', {
        method: 'POST',
        body: requestBody,
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await handler(mockRequest, { params: { id: '1' } });

      expect(result.status).toBe(400);
      const json = await result.json();
      expect(json.error).toBe('ids (array) and updates (object) are required');
    });
  });

  describe('Error Boundary Integration', () => {
    it('should handle service layer exceptions', async () => {
      mockProjectService.getInstance.mockReturnValue(mockProjectService);
      mockProjectService.get.mockRejectedValue(new Error('Database connection failed'));

      const handler = withErrorHandling(
        async (request: NextRequest, { params }: { params: { id: string } }) => {
          const paramResult = RouteParams.parseProjectId(params);
          if (!paramResult.success) return paramResult.response;

          const projectResult = await ServiceHelper.getProjectOrFail(paramResult.data.projectId);
          if (!projectResult.success) return projectResult.response;

          return NextResponse.json(projectResult.data.project);
        },
      );

      const mockRequest = new NextRequest('http://localhost/api/projects/1');
      const result = await handler(mockRequest, { params: { id: '1' } });

      expect(result.status).toBe(500);
      const json = await result.json();
      expect(json.error).toBe('Database connection failed');
    });

    it('should handle malformed JSON in request body', async () => {
      const handler = withErrorHandling(async (request: NextRequest) => {
        await request.json(); // This will throw for malformed JSON
        return NextResponse.json({ success: true });
      });

      const mockRequest = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        body: '{ invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await handler(mockRequest);
      expect(result.status).toBe(500);
    });
  });
});
