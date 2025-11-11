/**
 * HTTP API client for devlog operations
 * Provides project-aware interface to @codervisor/devlog-web API endpoints
 */

import axios, { type AxiosInstance, type AxiosError, type AxiosRequestConfig } from 'axios';
import tunnel from 'tunnel';
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
import { logger } from '../server/index.js';

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
  private axiosInstance: AxiosInstance;
  private retries: number;
  private currentProjectId: number | null = null;

  constructor(config: DevlogApiClientConfig) {
    this.retries = config.retries || 3;

    // Create HTTPS agent for proxy tunneling to fix redirect loops
    let httpsAgent;
    const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY;

    if (proxyUrl && config.baseUrl.includes('devlog.codervisor.dev')) {
      // Use tunnel agent for devlog.codervisor.dev to avoid redirect loops
      const proxyMatch = proxyUrl.match(/https?:\/\/([^:]+):(\d+)/);
      if (proxyMatch) {
        httpsAgent = tunnel.httpsOverHttp({
          proxy: {
            host: proxyMatch[1],
            port: parseInt(proxyMatch[2]),
          },
        });
      }
    }

    this.axiosInstance = axios.create({
      baseURL: config.baseUrl.replace(/\/$/, ''), // Remove trailing slash
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      // Use custom agent if we created one, otherwise let axios handle proxy normally
      ...(httpsAgent && {
        httpsAgent,
        proxy: false, // Disable built-in proxy when using custom agent
      }),
    });

    // Setup response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        throw this.handleAxiosError(error);
      },
    );
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
   * Handle axios errors and convert to DevlogApiClientError
   */
  private handleAxiosError(error: AxiosError): DevlogApiClientError {
    let errorMessage = error.message;
    let statusCode: number | undefined;
    let responseData: any;

    logger.error('API request failed', { error: error.message, code: error.code });
    if (error.response) {
      // Server responded with error status
      statusCode = error.response.status;
      responseData = error.response.data;

      // Try to extract error message from response
      if (responseData) {
        if (typeof responseData === 'string') {
          errorMessage = responseData;
        } else if (typeof responseData === 'object') {
          errorMessage = responseData.error?.message || responseData.message || error.message;
        }
      }

      errorMessage = `HTTP ${statusCode}: ${errorMessage}`;
    } else if (error.request) {
      // Request was made but no response received
      errorMessage = `Network error: ${error.message}`;

      // Handle specific proxy/network related errors with helpful context
      if (error.code === 'ERR_FR_TOO_MANY_REDIRECTS') {
        errorMessage += '. Fixed: Using tunnel agent to avoid proxy redirect loops.';
      } else if (error.code === 'ECONNRESET') {
        errorMessage += '. The server may be unreachable from this network.';
      }
    }

    return new DevlogApiClientError(errorMessage, statusCode, responseData);
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest(
    endpoint: string,
    options: AxiosRequestConfig = {},
    attempt = 1,
  ): Promise<any> {
    try {
      logger.debug(`Making request to ${endpoint}`, options);
      const response = await this.axiosInstance.request({
        url: endpoint,
        ...options,
      });

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;

      // Only retry on network errors or 5xx server errors, not on client errors
      const shouldRetry =
        attempt < this.retries && (!axiosError.response || axiosError.response.status >= 500);

      if (shouldRetry) {
        logger.warn(`Request failed (attempt ${attempt}/${this.retries}), retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        return this.makeRequest(endpoint, options, attempt + 1);
      }

      // Re-throw the error (will be handled by the response interceptor)
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

    // Handle paginated response format (devlog list API)
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
    return this.makeRequest(endpoint, { method: 'GET' });
  }

  /**
   * POST request helper
   */
  private async post(endpoint: string, data?: any): Promise<any> {
    return this.makeRequest(endpoint, {
      method: 'POST',
      data: data,
    });
  }

  /**
   * PUT request helper
   */
  private async put(endpoint: string, data?: any): Promise<any> {
    return this.makeRequest(endpoint, {
      method: 'PUT',
      data: data,
    });
  }

  /**
   * DELETE request helper
   */
  private async delete(endpoint: string): Promise<any> {
    return this.makeRequest(endpoint, { method: 'DELETE' });
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

  // Document Operations
  async uploadDocument(
    devlogId: number,
    formData: FormData,
  ): Promise<any> {
    // Use axios to upload form data directly
    const response = await this.axiosInstance.post(
      `${this.getProjectEndpoint()}/devlogs/${devlogId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return this.unwrapApiResponse(response.data);
  }

  async listDocuments(devlogId: number): Promise<any[]> {
    const response = await this.get(`${this.getProjectEndpoint()}/devlogs/${devlogId}/documents`);
    const result = this.unwrapApiResponse(response);
    return (result as any)?.items || result || [];
  }

  async getDocument(devlogId: number, documentId: string): Promise<any> {
    const response = await this.get(
      `${this.getProjectEndpoint()}/devlogs/${devlogId}/documents/${documentId}`
    );
    return this.unwrapApiResponse(response);
  }

  async deleteDocument(devlogId: number, documentId: string): Promise<void> {
    const response = await this.delete(
      `${this.getProjectEndpoint()}/devlogs/${devlogId}/documents/${documentId}`
    );
    return this.unwrapApiResponse<void>(response);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      logger.info('Performing health check...');
      logger.debug('API Base URL', { baseURL: this.axiosInstance.defaults.baseURL });
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
