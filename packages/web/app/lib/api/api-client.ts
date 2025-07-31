/**
 * Centralized API client for handling standardized API responses
 *
 * This client handles the new standardized response envelope format:
 * Success: { success: true, data: T, meta: { timestamp, ... } }
 * Error: { success: false, error: { code, message, details? }, meta: { timestamp, ... } }
 */

import type { ApiResponse, ApiSuccessResponse, ApiErrorResponse } from '@/schemas/responses';

/**
 * Custom error class for API errors with structured information
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * Check if this is a specific error type
   */
  is(code: string): boolean {
    return this.code === code;
  }

  /**
   * Check if this is a not found error
   */
  isNotFound(): boolean {
    return this.code.endsWith('_NOT_FOUND') || this.status === 404;
  }

  /**
   * Check if this is a validation error
   */
  isValidation(): boolean {
    return this.code === 'VALIDATION_FAILED' || this.status === 422;
  }

  /**
   * Check if this is a client error (400-499)
   */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Check if this is a server error (500-599)
   */
  isServerError(): boolean {
    return this.status >= 500;
  }
}

/**
 * API client configuration
 */
export interface ApiClientConfig {
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Centralized API client with envelope handling
 */
export class ApiClient {
  private config: Required<ApiClientConfig>;

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      baseUrl: '',
      timeout: 30000,
      headers: {},
      ...config,
    };
  }

  /**
   * Make an API request and handle the standardized response envelope
   */
  async request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    const fullUrl = `${this.config.baseUrl}${url}`;

    // Set up request options
    const requestOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
        ...options.headers,
      },
      ...options,
    };

    // Add timeout signal
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    requestOptions.signal = controller.signal;

    try {
      const response = await fetch(fullUrl, requestOptions);
      clearTimeout(timeoutId);

      // Handle different response types
      if (response.status === 204) {
        // No content response
        return undefined as T;
      }

      // Try to parse JSON response
      let envelope: ApiResponse<T>;
      try {
        envelope = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, create a generic error
        throw new ApiError(
          'PARSE_ERROR',
          `Failed to parse response: ${parseError}`,
          response.status,
        );
      }

      // Handle standardized response envelope
      if ('success' in envelope) {
        if (envelope.success) {
          // Success response - return the data
          return (envelope as ApiSuccessResponse<T>).data;
        } else {
          // Error response - throw structured error
          const errorResponse = envelope as ApiErrorResponse;
          throw new ApiError(
            errorResponse.error.code,
            errorResponse.error.message,
            response.status,
            errorResponse.error.details,
          );
        }
      } else {
        // Legacy response format - return as-is for backward compatibility
        console.warn(`Legacy response format detected for ${url}. Consider updating the API.`);
        return envelope as T;
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError('TIMEOUT', 'Request timeout', 408);
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError('NETWORK_ERROR', 'Network error', 0);
      }

      // Generic error fallback
      throw new ApiError(
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'Unknown error occurred',
        500,
      );
    }
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, options?: Omit<RequestInit, 'method' | 'body'>): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    options?: Omit<RequestInit, 'method' | 'body'>,
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    options?: Omit<RequestInit, 'method' | 'body'>,
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    options?: Omit<RequestInit, 'method' | 'body'>,
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, options?: Omit<RequestInit, 'method' | 'body'>): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient();

/**
 * Helper function for handling API errors in components
 */
export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
