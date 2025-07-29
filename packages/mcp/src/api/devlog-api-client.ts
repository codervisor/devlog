/**
 * HTTP API client for devlog operations
 * Provides project-aware interface to @codervisor/devlog-web API endpoints
 */

import type {
  DevlogEntry,
  DevlogFilter,
  CreateDevlogRequest,
  UpdateDevlogRequest,
  PaginatedResult,
  DevlogStats,
} from '@codervisor/devlog-core';

export interface DevlogApiClientConfig {
  /** Base URL for the web API */
  baseUrl: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Number of retry attempts for failed requests */
  retries?: number;
}

/**
 * Custom error class for API client errors
 */
export class DevlogApiClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any,
  ) {
    super(message);
    this.name = 'DevlogApiClientError';
  }
}

/**
 * HTTP API client for devlog operations
 */
export class DevlogApiClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;
  private currentProjectId: number | null = null;

  constructor(config: DevlogApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 3;
  }

  /**
   * Set the current project ID for all subsequent requests
   */
  setCurrentProject(projectId: number): void {
    this.currentProjectId = projectId;
  }

  /**
   * Get the current project ID
   */
  getCurrentProjectId(): number | null {
    return this.currentProjectId;
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest(
    endpoint: string,
    options: RequestInit = {},
    attempt = 1,
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(this.timeout),
    };

    try {
      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch {
          errorText = response.statusText;
        }

        // Try to parse JSON error response
        let errorData = errorText;
        try {
          const parsed = JSON.parse(errorText);
          errorData = parsed.error?.message || parsed.message || errorText;
        } catch {
          // Keep original text if not JSON
        }

        throw new DevlogApiClientError(
          `HTTP ${response.status}: ${errorData}`,
          response.status,
          errorText,
        );
      }

      return response;
    } catch (error) {
      if (attempt < this.retries && !(error instanceof DevlogApiClientError)) {
        console.warn(`Request failed (attempt ${attempt}/${this.retries}), retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        return this.makeRequest(endpoint, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Unwrap standardized API response
   */
  private unwrapApiResponse<T>(response: any): T {
    // Handle standardized API response format with success/data wrapper (projects API)
    if (
      response &&
      typeof response === 'object' &&
      response.success === true &&
      'data' in response
    ) {
      return response.data;
    }

    // Handle paginated response format (devlogs list API)
    if (
      response &&
      typeof response === 'object' &&
      'items' in response &&
      'pagination' in response
    ) {
      return response as T;
    }

    // Handle direct response (individual devlog, etc.)
    return response;
  }

  /**
   * GET request helper
   */
  private async get(endpoint: string): Promise<any> {
    const response = await this.makeRequest(endpoint, { method: 'GET' });
    return response.json();
  }

  /**
   * POST request helper
   */
  private async post(endpoint: string, data?: any): Promise<any> {
    const response = await this.makeRequest(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.json();
  }

  /**
   * PUT request helper
   */
  private async put(endpoint: string, data?: any): Promise<any> {
    const response = await this.makeRequest(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.json();
  }

  /**
   * DELETE request helper
   */
  private async delete(endpoint: string): Promise<any> {
    const response = await this.makeRequest(endpoint, { method: 'DELETE' });
    return response.json();
  }

  /**
   * Get the project-aware endpoint prefix
   */
  private getProjectEndpoint(): string {
    const projectId = this.currentProjectId || 'default';
    return `/api/projects/${projectId}`;
  }

  // Project Management
  async listProjects(): Promise<any[]> {
    const response = await this.get('/api/projects');
    return this.unwrapApiResponse<any[]>(response);
  }

  async getProject(projectId?: number): Promise<any> {
    const id = projectId || this.currentProjectId || 0;
    const response = await this.get(`/api/projects/${id}`);
    return this.unwrapApiResponse<any>(response);
  }

  async createProject(data: any): Promise<any> {
    const response = await this.post('/api/projects', data);
    return this.unwrapApiResponse<any>(response);
  }

  // Devlog Operations
  async createDevlog(data: CreateDevlogRequest): Promise<DevlogEntry> {
    const response = await this.post(`${this.getProjectEndpoint()}/devlogs`, data);
    return this.unwrapApiResponse<DevlogEntry>(response);
  }

  async getDevlog(id: number): Promise<DevlogEntry> {
    const response = await this.get(`${this.getProjectEndpoint()}/devlogs/${id}`);
    return this.unwrapApiResponse<DevlogEntry>(response);
  }

  async updateDevlog(id: number, data: UpdateDevlogRequest): Promise<DevlogEntry> {
    const response = await this.put(`${this.getProjectEndpoint()}/devlogs/${id}`, data);
    return this.unwrapApiResponse<DevlogEntry>(response);
  }

  async deleteDevlog(id: number): Promise<void> {
    const response = await this.delete(`${this.getProjectEndpoint()}/devlogs/${id}`);
    return this.unwrapApiResponse<void>(response);
  }

  async listDevlogs(filter?: DevlogFilter): Promise<PaginatedResult<DevlogEntry>> {
    const params = new URLSearchParams();

    if (filter) {
      if (filter.status?.length) params.append('status', filter.status.join(','));
      if (filter.type?.length) params.append('type', filter.type.join(','));
      if (filter.priority?.length) params.append('priority', filter.priority.join(','));
      if (filter.archived !== undefined) params.append('archived', String(filter.archived));
      if (filter.pagination?.page) params.append('page', String(filter.pagination.page));
      if (filter.pagination?.limit) params.append('limit', String(filter.pagination.limit));
      if (filter.pagination?.sortBy) params.append('sortBy', filter.pagination.sortBy);
      if (filter.pagination?.sortOrder) params.append('sortOrder', filter.pagination.sortOrder);
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await this.get(`${this.getProjectEndpoint()}/devlogs${query}`);
    return this.unwrapApiResponse<PaginatedResult<DevlogEntry>>(response);
  }

  async searchDevlogs(query: string, filter?: DevlogFilter): Promise<PaginatedResult<DevlogEntry>> {
    const params = new URLSearchParams({ search: query });

    if (filter) {
      if (filter.status?.length) params.append('status', filter.status.join(','));
      if (filter.type?.length) params.append('type', filter.type.join(','));
      if (filter.priority?.length) params.append('priority', filter.priority.join(','));
      if (filter.archived !== undefined) params.append('archived', String(filter.archived));
    }

    const response = await this.get(`${this.getProjectEndpoint()}/devlogs?${params.toString()}`);
    return this.unwrapApiResponse<PaginatedResult<DevlogEntry>>(response);
  }

  async addDevlogNote(
    devlogId: number,
    note: string,
    category?: string,
    files?: string[],
    codeChanges?: string,
  ): Promise<DevlogEntry> {
    const response = await this.post(`${this.getProjectEndpoint()}/devlogs/${devlogId}/notes`, {
      note,
      category,
      files,
      codeChanges,
    });
    return this.unwrapApiResponse<DevlogEntry>(response);
  }

  async archiveDevlog(id: number): Promise<DevlogEntry> {
    const response = await this.put(`${this.getProjectEndpoint()}/devlogs/${id}/archive`, {});
    return this.unwrapApiResponse<DevlogEntry>(response);
  }

  async unarchiveDevlog(id: number): Promise<DevlogEntry> {
    const response = await this.put(`${this.getProjectEndpoint()}/devlogs/${id}/unarchive`, {});
    return this.unwrapApiResponse<DevlogEntry>(response);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await this.get('/api/health');
      const result = this.unwrapApiResponse<{ status: string; timestamp: string }>(response);

      // Validate the health check response
      if (!result || typeof result !== 'object' || !result.status) {
        throw new Error('Invalid health check response format');
      }

      return result;
    } catch (error) {
      // If health endpoint doesn't exist, try a basic endpoint
      console.warn('Health endpoint failed, trying projects endpoint as backup...');
      try {
        await this.get('/api/projects');
        return {
          status: 'ok',
          timestamp: new Date().toISOString(),
        };
      } catch (backupError) {
        throw new DevlogApiClientError(
          `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
          0,
          error,
        );
      }
    }
  }
}
