/**
 * Project API client for handling project-related HTTP requests
 * 
 * This client provides a higher-level interface for project operations,
 * building on top of the base ApiClient for standardized error handling
 * and response format processing.
 */

import { ApiClient, ApiError } from './api-client.js';
import type { Project } from '@codervisor/devlog-core';

/**
 * Project creation request data
 */
export interface CreateProjectRequest {
  name: string;
  description?: string;
}

/**
 * Project update request data
 */
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

/**
 * Project deletion response
 */
export interface DeleteProjectResponse {
  deleted: boolean;
  projectId: number;
}

/**
 * Client for project-related API operations
 * 
 * Provides typed methods for all project CRUD operations while leveraging
 * the base ApiClient for consistent error handling and response processing.
 * 
 * @example
 * ```typescript
 * const projectClient = new ProjectApiClient();
 * 
 * // List all projects
 * const projects = await projectClient.list();
 * 
 * // Get a specific project
 * const project = await projectClient.get('my-project');
 * 
 * // Create a new project
 * const newProject = await projectClient.create({
 *   name: 'New Project',
 *   description: 'A new project for testing'
 * });
 * ```
 */
export class ProjectApiClient {
  private apiClient: ApiClient;

  /**
   * Create a new ProjectApiClient instance
   * 
   * @param baseUrl - Optional base URL for API requests (defaults to current origin)
   */
  constructor(baseUrl?: string) {
    this.apiClient = new ApiClient({ baseUrl: baseUrl || '' });
  }

  /**
   * List all projects
   * 
   * @returns Promise resolving to array of projects
   * @throws {ApiError} When the request fails or server returns an error
   */
  async list(): Promise<Project[]> {
    try {
      return await this.apiClient.get<Project[]>('/api/projects');
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        'PROJECT_LIST_FAILED',
        'Failed to fetch projects list',
        500,
        { originalError: error }
      );
    }
  }

  /**
   * Get a specific project by name
   * 
   * @param projectName - The name of the project to retrieve
   * @returns Promise resolving to the project data
   * @throws {ApiError} When the project is not found or request fails
   */
  async get(projectName: string): Promise<Project> {
    if (!projectName || typeof projectName !== 'string') {
      throw new ApiError(
        'INVALID_PROJECT_NAME',
        'Project name must be a non-empty string',
        400
      );
    }

    try {
      return await this.apiClient.get<Project>(`/api/projects/${encodeURIComponent(projectName)}`);
    } catch (error) {
      if (error instanceof ApiError) {
        // Re-throw API errors with additional context
        if (error.isNotFound()) {
          throw new ApiError(
            'PROJECT_NOT_FOUND',
            `Project '${projectName}' not found`,
            404,
            { projectName }
          );
        }
        throw error;
      }
      throw new ApiError(
        'PROJECT_GET_FAILED',
        `Failed to fetch project '${projectName}'`,
        500,
        { projectName, originalError: error }
      );
    }
  }

  /**
   * Create a new project
   * 
   * @param projectData - The project data for creation
   * @returns Promise resolving to the created project
   * @throws {ApiError} When validation fails or creation fails
   */
  async create(projectData: CreateProjectRequest): Promise<Project> {
    if (!projectData || !projectData.name) {
      throw new ApiError(
        'INVALID_PROJECT_DATA',
        'Project name is required',
        400,
        { providedData: projectData }
      );
    }

    try {
      return await this.apiClient.post<Project>('/api/projects', projectData);
    } catch (error) {
      if (error instanceof ApiError) {
        // Enhance validation errors with more context
        if (error.isValidation()) {
          throw new ApiError(
            'PROJECT_VALIDATION_FAILED',
            error.message,
            422,
            { ...error.details, projectData }
          );
        }
        throw error;
      }
      throw new ApiError(
        'PROJECT_CREATE_FAILED',
        'Failed to create project',
        500,
        { projectData, originalError: error }
      );
    }
  }

  /**
   * Update an existing project
   * 
   * @param projectName - The name of the project to update
   * @param updates - The updates to apply to the project
   * @returns Promise resolving to the updated project
   * @throws {ApiError} When the project is not found or update fails
   */
  async update(projectName: string, updates: UpdateProjectRequest): Promise<Project> {
    if (!projectName || typeof projectName !== 'string') {
      throw new ApiError(
        'INVALID_PROJECT_NAME',
        'Project name must be a non-empty string',
        400
      );
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw new ApiError(
        'INVALID_UPDATE_DATA',
        'At least one field must be provided for update',
        400,
        { providedData: updates }
      );
    }

    try {
      return await this.apiClient.put<Project>(
        `/api/projects/${encodeURIComponent(projectName)}`,
        updates
      );
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.isNotFound()) {
          throw new ApiError(
            'PROJECT_NOT_FOUND',
            `Project '${projectName}' not found`,
            404,
            { projectName }
          );
        }
        if (error.isValidation()) {
          throw new ApiError(
            'PROJECT_VALIDATION_FAILED',
            error.message,
            422,
            { ...error.details, projectName, updates }
          );
        }
        throw error;
      }
      throw new ApiError(
        'PROJECT_UPDATE_FAILED',
        `Failed to update project '${projectName}'`,
        500,
        { projectName, updates, originalError: error }
      );
    }
  }

  /**
   * Delete a project
   * 
   * @param projectName - The name of the project to delete
   * @returns Promise resolving to deletion confirmation
   * @throws {ApiError} When the project is not found or deletion fails
   */
  async delete(projectName: string): Promise<DeleteProjectResponse> {
    if (!projectName || typeof projectName !== 'string') {
      throw new ApiError(
        'INVALID_PROJECT_NAME',
        'Project name must be a non-empty string',
        400
      );
    }

    try {
      return await this.apiClient.delete<DeleteProjectResponse>(
        `/api/projects/${encodeURIComponent(projectName)}`
      );
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.isNotFound()) {
          throw new ApiError(
            'PROJECT_NOT_FOUND',
            `Project '${projectName}' not found`,
            404,
            { projectName }
          );
        }
        throw error;
      }
      throw new ApiError(
        'PROJECT_DELETE_FAILED',
        `Failed to delete project '${projectName}'`,
        500,
        { projectName, originalError: error }
      );
    }
  }

  /**
   * Check if a project exists
   * 
   * @param projectName - The name of the project to check
   * @returns Promise resolving to true if project exists, false otherwise
   */
  async exists(projectName: string): Promise<boolean> {
    try {
      await this.get(projectName);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.isNotFound()) {
        return false;
      }
      // Re-throw non-404 errors
      throw error;
    }
  }
}

/**
 * Default project API client instance
 * 
 * Pre-configured client ready to use throughout the application
 */
export const projectApiClient = new ProjectApiClient();

/**
 * Type guard to check if an error is related to project operations
 */
export function isProjectApiError(error: unknown): error is ApiError {
  return error instanceof ApiError && (
    error.code.startsWith('PROJECT_') ||
    error.code.includes('PROJECT')
  );
}