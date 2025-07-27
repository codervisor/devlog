/**
 * HTTP Client for DevLog ChatHub API
 *
 * Handles communication with the devlog server API endpoints,
 * specifically for streaming chat data to the ChatHub service.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { ChatSession, ChatMessage } from '@codervisor/devlog-core';

export interface ChatImportRequest {
  sessions: ChatSession[];
  messages: ChatMessage[];
  source: string;
  workspaceInfo?: {
    name?: string;
    path?: string;
    [key: string]: unknown;
  };
}

export interface ChatImportResponse {
  success: boolean;
  importId: string;
  status: string;
  progress: {
    importId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: {
      sessionsProcessed: number;
      messagesProcessed: number;
      totalSessions: number;
      totalMessages: number;
      percentage: number;
    };
    startedAt: string;
    completedAt?: string;
    error?: string;
  };
  message: string;
}

export interface ChatProgressResponse {
  success: boolean;
  progress: {
    importId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: {
      sessionsProcessed: number;
      messagesProcessed: number;
      totalSessions: number;
      totalMessages: number;
      percentage: number;
    };
    startedAt: string;
    completedAt?: string;
    error?: string;
  };
}

export interface DevlogApiClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export class DevlogApiClient {
  private client: AxiosInstance;
  private config: DevlogApiClientConfig;

  constructor(config: DevlogApiClientConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request/response interceptors for error handling
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error: any) => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
      },
    );

    // Response interceptor for error handling and retries
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`[API] ${response.status} ${response.config.url}`);
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Don't retry if we've exceeded max retries
        if (originalRequest._retryCount >= (this.config.retries || 3)) {
          console.error('[API] Max retries exceeded:', error.message);
          return Promise.reject(this.formatError(error));
        }

        // Retry on network errors or 5xx server errors
        if (
          error.code === 'ECONNREFUSED' ||
          error.code === 'ETIMEDOUT' ||
          (error.response?.status && error.response.status >= 500)
        ) {
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

          console.log(`[API] Retrying request (attempt ${originalRequest._retryCount})...`);

          // Wait before retrying
          await new Promise((resolve) =>
            setTimeout(resolve, this.config.retryDelay! * originalRequest._retryCount),
          );

          return this.client(originalRequest);
        }

        return Promise.reject(this.formatError(error));
      },
    );
  }

  private formatError(error: AxiosError): Error {
    if (error.response) {
      // Server responded with error status
      const message = (error.response.data as any)?.error || error.response.statusText;
      return new Error(`API Error (${error.response.status}): ${message}`);
    } else if (error.request) {
      // Request made but no response received
      return new Error(`Network Error: Could not connect to server at ${this.config.baseURL}`);
    } else {
      // Something else happened
      return new Error(`Request Error: ${error.message}`);
    }
  }

  /**
   * Test connection to the devlog server
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/health');
      return response.status === 200;
    } catch (error) {
      console.error('[API] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Import chat data to a workspace
   */
  async importChatData(workspaceId: string, data: ChatImportRequest): Promise<ChatImportResponse> {
    try {
      const response = await this.client.post(`/api/workspaces/${workspaceId}/chat/import`, data);
      return response.data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to import chat data');
    }
  }

  /**
   * Get import progress status
   */
  async getImportProgress(workspaceId: string, importId: string): Promise<ChatProgressResponse> {
    try {
      const response = await this.client.get(
        `/api/workspaces/${workspaceId}/chat/import?importId=${importId}`,
      );
      return response.data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to get import progress');
    }
  }

  /**
   * List workspaces available on the server
   */
  async listWorkspaces(): Promise<any[]> {
    try {
      const response = await this.client.get('/api/workspaces');
      return response.data.workspaces || [];
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to list workspaces');
    }
  }

  /**
   * Get workspace details
   */
  async getWorkspace(workspaceId: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/workspaces/${workspaceId}`);
      return response.data;
    } catch (error) {
      throw error instanceof Error ? error : new Error(`Failed to get workspace ${workspaceId}`);
    }
  }

  /**
   * Search chat content in a workspace
   */
  async searchChatContent(
    workspaceId: string,
    query: string,
    options: {
      limit?: number;
      caseSensitive?: boolean;
      searchType?: 'exact' | 'fuzzy' | 'semantic';
    } = {},
  ): Promise<any> {
    try {
      const params = new URLSearchParams({
        query,
        limit: (options.limit || 50).toString(),
        caseSensitive: (options.caseSensitive || false).toString(),
        searchType: options.searchType || 'exact',
      });

      const response = await this.client.get(
        `/api/workspaces/${workspaceId}/chat/search?${params.toString()}`,
      );
      return response.data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to search chat content');
    }
  }

  /**
   * Get chat statistics for a workspace
   */
  async getChatStats(workspaceId: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/workspaces/${workspaceId}/chat/stats`);
      return response.data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to get chat statistics');
    }
  }
}
