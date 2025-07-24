/**
 * HTTP API client for devlog operations
 * Provides workspace-aware interface to @devlog/web API endpoints
 */

import type {
  DevlogEntry,
  DevlogFilter,
  CreateDevlogRequest,
  UpdateDevlogRequest,
  PaginatedResult,
  WorkspaceMetadata,
  WorkspaceContext,
  DevlogStats,
} from '@devlog/core';

export interface DevlogApiClientConfig {
  /** Base URL for the web API server */
  baseUrl: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Number of retry attempts for failed requests */
  retries?: number;
  /** Additional headers to include with requests */
  headers?: Record<string, string>;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export class DevlogApiClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error,
  ) {
    super(message);
    this.name = 'DevlogApiClientError';
  }
}

/**
 * HTTP client for devlog API operations
 * Handles workspace-aware requests and response parsing
 */
export class DevlogApiClient {
  private config: Required<DevlogApiClientConfig>;
  private currentWorkspaceId: string | null = null;

  constructor(config: DevlogApiClientConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default
      retries: 3,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      ...config,
    };
  }

  /**
   * Set the current workspace ID for subsequent requests
   */
  setCurrentWorkspace(workspaceId: string): void {
    this.currentWorkspaceId = workspaceId;
  }

  /**
   * Get the current workspace ID
   */
  getCurrentWorkspaceId(): string | null {
    return this.currentWorkspaceId;
  }

  /**
   * Make HTTP request with error handling and retries
   */
  private async request<T>(method: string, path: string, data?: any, retryCount = 0): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: this.config.headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage: string;

        try {
          const errorData = JSON.parse(errorText) as ApiResponse;
          errorMessage = errorData.error || errorText;
        } catch {
          errorMessage = errorText || `HTTP ${response.status}`;
        }

        throw new DevlogApiClientError(`API request failed: ${errorMessage}`, response.status);
      }

      const responseData = (await response.json()) as ApiResponse<T>;

      if (responseData.error) {
        throw new DevlogApiClientError(responseData.error);
      }

      return responseData.data || (responseData as T);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DevlogApiClientError) {
        throw error;
      }

      // Handle fetch errors (network, timeout, etc.)
      if (retryCount < this.config.retries) {
        console.warn(`Request failed, retrying (${retryCount + 1}/${this.config.retries}):`, error);
        return this.request<T>(method, path, data, retryCount + 1);
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new DevlogApiClientError(
        `Request failed after ${this.config.retries} retries: ${message}`,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Build workspace-aware API path
   */
  private workspacePath(path: string, workspaceId?: string): string {
    const wsId = workspaceId || this.currentWorkspaceId;
    if (!wsId) {
      throw new DevlogApiClientError('No workspace specified and no current workspace set');
    }
    return `/api/workspaces/${wsId}${path}`;
  }

  // === Workspace Operations ===

  /**
   * List all available workspaces
   */
  async listWorkspaces(): Promise<{
    workspaces: WorkspaceMetadata[];
    currentWorkspace: WorkspaceContext | null;
  }> {
    return this.request('GET', '/api/workspaces');
  }

  /**
   * Get current workspace context
   */
  async getCurrentWorkspace(): Promise<WorkspaceContext | null> {
    const result = await this.listWorkspaces();
    return result.currentWorkspace;
  }

  /**
   * Switch to a different workspace (client-side only)
   * This updates the client's current workspace ID without server-side state
   */
  switchToWorkspace(workspaceId: string): void {
    this.currentWorkspaceId = workspaceId;
  }

  /**
   * Create a new workspace
   */
  async createWorkspace(
    workspace: Omit<WorkspaceMetadata, 'createdAt' | 'lastAccessedAt'>,
    storage: any, // StorageConfig type
  ): Promise<WorkspaceMetadata> {
    return this.request('POST', '/api/workspaces', { workspace, storage });
  }

  /**
   * Delete a workspace
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.request('DELETE', `/api/workspaces/${workspaceId}`);
  }

  // === Devlog Operations ===

  /**
   * List devlogs from current or specified workspace
   */
  async listDevlogs(
    filter?: DevlogFilter,
    workspaceId?: string,
  ): Promise<PaginatedResult<DevlogEntry>> {
    const params = new URLSearchParams();

    if (filter) {
      if (filter.status) {
        if (Array.isArray(filter.status)) {
          params.set('status', filter.status.join(','));
        } else {
          params.set('status', filter.status);
        }
      }
      if (filter.type) {
        const typeValue = Array.isArray(filter.type) ? filter.type.join(',') : filter.type;
        params.set('type', typeValue);
      }
      if (filter.priority) {
        const priorityValue = Array.isArray(filter.priority)
          ? filter.priority.join(',')
          : filter.priority;
        params.set('priority', priorityValue);
      }
      if (filter.archived !== undefined) params.set('archived', filter.archived.toString());

      if (filter.pagination) {
        if (filter.pagination.page) params.set('page', filter.pagination.page.toString());
        if (filter.pagination.limit) params.set('limit', filter.pagination.limit.toString());
        if (filter.pagination.sortBy) params.set('sortBy', filter.pagination.sortBy);
        if (filter.pagination.sortOrder) params.set('sortOrder', filter.pagination.sortOrder);
      }
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    const path = this.workspacePath(`/devlogs${query}`, workspaceId);

    return this.request('GET', path);
  }

  /**
   * Get a specific devlog entry
   */
  async getDevlog(id: string | number, workspaceId?: string): Promise<DevlogEntry | null> {
    const path = this.workspacePath(`/devlogs/${id}`, workspaceId);
    try {
      return await this.request('GET', path);
    } catch (error) {
      if (error instanceof DevlogApiClientError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create a new devlog entry
   */
  async createDevlog(request: CreateDevlogRequest, workspaceId?: string): Promise<DevlogEntry> {
    const path = this.workspacePath('/devlogs', workspaceId);
    return this.request('POST', path, request);
  }

  /**
   * Update an existing devlog entry
   */
  async updateDevlog(
    id: string | number,
    data: UpdateDevlogRequest,
    workspaceId?: string,
  ): Promise<DevlogEntry> {
    const path = this.workspacePath(`/devlogs/${id}`, workspaceId);
    return this.request('PUT', path, data);
  }

  /**
   * Archive (soft delete) a devlog entry
   */
  async archiveDevlog(id: string | number, workspaceId?: string): Promise<void> {
    const path = this.workspacePath(`/devlogs/${id}`, workspaceId);
    await this.request('DELETE', path);
  }

  /**
   * Search devlogs within workspace
   */
  async searchDevlogs(
    query: string,
    filter?: DevlogFilter,
    workspaceId?: string,
  ): Promise<PaginatedResult<DevlogEntry>> {
    const params = new URLSearchParams({ query });

    if (filter) {
      if (filter.status) {
        if (Array.isArray(filter.status)) {
          params.set('status', filter.status.join(','));
        } else {
          params.set('status', filter.status);
        }
      }
      if (filter.type) {
        const typeValue = Array.isArray(filter.type) ? filter.type.join(',') : filter.type;
        params.set('type', typeValue);
      }
      if (filter.priority) {
        const priorityValue = Array.isArray(filter.priority)
          ? filter.priority.join(',')
          : filter.priority;
        params.set('priority', priorityValue);
      }
    }

    const path = this.workspacePath(`/devlogs/search?${params.toString()}`, workspaceId);
    return this.request('GET', path);
  }

  // === Batch Operations ===

  /**
   * Batch update multiple devlog entries
   */
  async batchUpdateDevlogs(
    ids: (string | number)[],
    updates: Partial<UpdateDevlogRequest>,
    workspaceId?: string,
  ): Promise<DevlogEntry[]> {
    const path = this.workspacePath('/devlogs/batch/update', workspaceId);
    return this.request('POST', path, { ids, updates });
  }

  /**
   * Batch archive multiple devlog entries
   */
  async batchArchiveDevlogs(ids: (string | number)[], workspaceId?: string): Promise<void> {
    const path = this.workspacePath('/devlogs/batch/delete', workspaceId);
    await this.request('POST', path, { ids });
  }

  /**
   * Add notes to multiple devlog entries
   */
  async batchAddNotes(
    entries: Array<{
      id: string | number;
      note: string;
      category?: string;
      codeChanges?: string;
      files?: string[];
    }>,
    workspaceId?: string,
  ): Promise<DevlogEntry[]> {
    const path = this.workspacePath('/devlogs/batch/note', workspaceId);
    return this.request('POST', path, { entries });
  }

  // === Statistics ===

  /**
   * Get overview statistics for workspace
   */
  async getWorkspaceStats(workspaceId?: string): Promise<DevlogStats> {
    const path = this.workspacePath('/devlogs/stats/overview', workspaceId);
    return this.request('GET', path);
  }

  // === Utility Methods ===

  /**
   * Test connection to the API server
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request('GET', '/api/workspaces');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get API server health status
   */
  async getHealthStatus(): Promise<{ status: string; timestamp: string }> {
    return this.request('GET', '/api/health');
  }
}
