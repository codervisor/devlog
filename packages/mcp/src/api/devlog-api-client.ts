/**
 * HTTP API client for devlog operations
 * Provides project-aware interface to @codervisor/devlog-web API endpoints
 */

import type {
  CreateDevlogRequest,
  DevlogEntry,
  DevlogFilter,
  DevlogNote,
  DevlogNoteCategory,
  PaginatedResult,
  PaginationMeta,
  SortOptions,
  UpdateDevlogRequest,
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
        let errorText: string;
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
    return `/projects/${projectId}`;
  }

  // Project Management
  async listProjects(): Promise<any[]> {
    const response = await this.get('/projects');
    return this.unwrapApiResponse<any[]>(response);
  }

  async getProject(projectId?: number): Promise<any> {
    const id = projectId || this.currentProjectId || 0;
    const response = await this.get(`/projects/${id}`);
    return this.unwrapApiResponse<any>(response);
  }

  async createProject(data: any): Promise<any> {
    const response = await this.post('/projects', data);
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

  async listDevlogs(
    args?: Partial<DevlogFilter & PaginationMeta & SortOptions>,
  ): Promise<PaginatedResult<DevlogEntry>> {
    const params = new URLSearchParams();

    if (args) {
      this.applyFilterToURLSearchParams(args, params);

      if (args.page) params.append('page', args.page.toString());
      if (args.limit) params.append('limit', args.limit.toString());

      if (args.sortBy) params.append('sortBy', args.sortBy);
      if (args.sortOrder) params.append('sortOrder', args.sortOrder);
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await this.get(`${this.getProjectEndpoint()}/devlogs${query}`);
    return this.unwrapApiResponse<PaginatedResult<DevlogEntry>>(response);
  }

  async searchDevlogs({
    query,
    ...args
  }: { query: string } & Partial<DevlogFilter & PaginationMeta>): Promise<
    PaginatedResult<DevlogEntry>
  > {
    const params = new URLSearchParams({ q: query });

    if (args) {
      this.applyFilterToURLSearchParams(args, params);
    }

    const response = await this.get(
      `${this.getProjectEndpoint()}/devlogs/search?${params.toString()}`,
    );
    const searchResponse = this.unwrapApiResponse<any>(response);

    // Transform search response to match PaginatedResult interface
    return {
      items: searchResponse.results.map((result: any) => result.entry),
      pagination: searchResponse.pagination,
    };
  }

  async addDevlogNote(devlogId: number, note: string, category?: string): Promise<DevlogEntry> {
    const response = await this.post(`${this.getProjectEndpoint()}/devlogs/${devlogId}/notes`, {
      note,
      category,
    });
    return this.unwrapApiResponse<DevlogEntry>(response);
  }

  async listDevlogNotes(
    devlogId: number,
    category?: DevlogNoteCategory,
    limit?: number,
  ): Promise<{ devlogId: number; total: number; notes: DevlogNote[] }> {
    const params = new URLSearchParams();

    if (category) params.append('category', category);
    if (limit) params.append('limit', limit.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await this.get(
      `${this.getProjectEndpoint()}/devlogs/${devlogId}/notes${query}`,
    );
    return this.unwrapApiResponse(response);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      console.log('Performing health check...');
      console.log('API Base URL:', this.baseUrl);
      const response = await this.get('/health');
      const result = this.unwrapApiResponse<{ status: string; timestamp: string }>(response);

      // Validate the health check response
      if (!result || typeof result !== 'object' || !result.status) {
        throw new Error('Invalid health check response format');
      }

      return result;
    } catch (error) {
      // If health endpoint doesn't exist, try a basic endpoint
      throw new DevlogApiClientError(
        `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        0,
        error,
      );
    }
  }

  private applyFilterToURLSearchParams(filter: DevlogFilter, params: URLSearchParams) {
    if (filter.status?.length) params.append('status', filter.status.join(','));
    if (filter.type?.length) params.append('type', filter.type.join(','));
    if (filter.priority?.length) params.append('priority', filter.priority.join(','));
    if (filter.archived !== undefined) params.append('archived', String(filter.archived));
  }
}
