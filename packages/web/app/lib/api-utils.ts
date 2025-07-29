/**
 * API utilities for handling common patterns in Next.js API routes
 */

import { NextResponse } from 'next/server';

/**
 * Parse and validate numeric parameters from Next.js route params
 */
export function parseParams<T extends Record<string, string>>(
  params: T,
): { success: true; data: Record<keyof T, number> } | { success: false; response: NextResponse } {
  const parsed: Record<string, number> = {};

  for (const [key, value] of Object.entries(params)) {
    const numericValue = parseInt(value, 10);

    if (isNaN(numericValue) || numericValue <= 0) {
      return {
        success: false,
        response: NextResponse.json(
          { error: `Invalid ${key}: must be a positive integer` },
          { status: 400 },
        ),
      };
    }

    parsed[key] = numericValue;
  }

  return {
    success: true,
    data: parsed as Record<keyof T, number>,
  };
}

/**
 * Type-safe parameter parser for specific route patterns
 */
export const RouteParams = {
  /**
   * Parse project ID parameter
   * Usage: /api/projects/[id]
   */
  parseProjectId(params: { id: string }) {
    const result = parseParams(params);
    if (!result.success) return result;

    return {
      success: true as const,
      data: { projectId: result.data.id },
    };
  },

  /**
   * Parse project ID and devlog ID parameters
   * Usage: /api/projects/[id]/devlogs/[devlogId]
   */
  parseProjectAndDevlogId(params: { id: string; devlogId: string }) {
    const result = parseParams(params);
    if (!result.success) return result;

    return {
      success: true as const,
      data: {
        projectId: result.data.id,
        devlogId: result.data.devlogId,
      },
    };
  },
};

/**
 * Service initialization helper
 * Ensures services are properly initialized before use
 */
export class ServiceHelper {
  /**
   * Get project and ensure it exists
   */
  static async getProjectOrFail(projectId: number) {
    const { ProjectService } = await import('@codervisor/devlog-core');
    const projectService = ProjectService.getInstance();
    const project = await projectService.get(projectId);
    if (!project) {
      return { success: false as const, response: ApiErrors.projectNotFound() };
    }

    return { success: true as const, data: { project, projectService } };
  }

  /**
   * Get devlog service for a project
   */
  static async getDevlogService(projectId: number) {
    const { DevlogService } = await import('@codervisor/devlog-core');
    const devlogService = DevlogService.getInstance(projectId);
    return devlogService;
  }

  /**
   * Get devlog entry and ensure it exists
   */
  static async getDevlogOrFail(projectId: number, devlogId: number) {
    const devlogService = await this.getDevlogService(projectId);

    const entry = await devlogService.get(devlogId);
    if (!entry) {
      return { success: false as const, response: ApiErrors.devlogNotFound() };
    }

    return { success: true as const, data: { entry, devlogService } };
  }
}

/**
 * Common error response patterns
 */
export const ApiErrors = {
  projectNotFound: () => NextResponse.json({ error: 'Project not found' }, { status: 404 }),
  devlogNotFound: () => NextResponse.json({ error: 'Devlog entry not found' }, { status: 404 }),
  invalidRequest: (message: string) => NextResponse.json({ error: message }, { status: 400 }),
  internalError: (message: string = 'Internal server error') =>
    NextResponse.json({ error: message }, { status: 500 }),
  forbidden: (message: string = 'Forbidden') =>
    NextResponse.json({ error: message }, { status: 403 }),
  unauthorized: (message: string = 'Unauthorized') =>
    NextResponse.json({ error: message }, { status: 401 }),
  notFound: (resource: string = 'Resource') =>
    NextResponse.json({ error: `${resource} not found` }, { status: 404 }),
  conflict: (message: string) => NextResponse.json({ error: message }, { status: 409 }),
  unprocessableEntity: (message: string) => NextResponse.json({ error: message }, { status: 422 }),
};

/**
 * Common success response patterns
 */
export const ApiResponses = {
  success: (data?: any) => NextResponse.json(data || { success: true }),
  created: (data: any) => NextResponse.json(data, { status: 201 }),
  noContent: () => new NextResponse(null, { status: 204 }),
  accepted: (data?: any) => NextResponse.json(data || { accepted: true }, { status: 202 }),
};

/**
 * Error handling wrapper for API routes
 */
export function withErrorHandling<T extends any[]>(handler: (...args: T) => Promise<NextResponse>) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error(`API Error:`, error);

      if (error instanceof Error) {
        // Handle known error types
        if (error.message.includes('not found')) {
          return ApiErrors.notFound();
        }
        if (error.message.includes('Invalid')) {
          return ApiErrors.invalidRequest(error.message);
        }

        return ApiErrors.internalError(error.message);
      }

      return ApiErrors.internalError();
    }
  };
}
