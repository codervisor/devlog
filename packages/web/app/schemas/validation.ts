/**
 * Centralized API validation utilities for web application
 * 
 * This module provides reusable validation utilities for all API endpoints.
 * It focuses on HTTP-specific validation concerns and error handling.
 */

import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Common API validation utilities
 */
export class ApiValidator {
  /**
   * Validate and parse JSON request body
   */
  static async validateJsonBody<T>(
    request: NextRequest,
    schema: z.ZodSchema<T, any, any>
  ): Promise<{
    success: true;
    data: T;
  } | {
    success: false;
    response: NextResponse;
  }> {
    try {
      const body = await request.json();
      const result = schema.safeParse(body);

      if (result.success) {
        return { success: true, data: result.data };
      }

      const errors = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return {
        success: false,
        response: NextResponse.json(
          { 
            error: 'Invalid request body',
            details: errors,
          },
          { status: 400 }
        ),
      };
    } catch (error) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Invalid JSON in request body' },
          { status: 400 }
        ),
      };
    }
  }

  /**
   * Validate URL parameters
   */
  static validateParams<T>(
    params: unknown,
    schema: z.ZodSchema<T, any, any>
  ): {
    success: true;
    data: T;
  } | {
    success: false;
    response: NextResponse;
  } {
    const result = schema.safeParse(params);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    return {
      success: false,
      response: NextResponse.json(
        { 
          error: 'Invalid URL parameters',
          details: errors,
        },
        { status: 400 }
      ),
    };
  }

  /**
   * Validate query parameters
   */
  static validateQuery<T>(
    searchParams: URLSearchParams,
    schema: z.ZodSchema<T, any, any>
  ): {
    success: true;
    data: T;
  } | {
    success: false;
    response: NextResponse;
  } {
    // Convert URLSearchParams to plain object
    const queryObject: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryObject[key] = value;
    });

    const result = schema.safeParse(queryObject);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    return {
      success: false,
      response: NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: errors,
        },
        { status: 400 }
      ),
    };
  }

  /**
   * Handle service layer errors and convert to appropriate HTTP responses
   */
  static handleServiceError(error: unknown): NextResponse {
    if (error instanceof Error) {
      // Check if it's a validation error from the service layer
      if (error.message.includes('Invalid project data') || 
          error.message.includes('Invalid update data') ||
          error.message.includes('Invalid project ID') ||
          error.message.includes('Invalid devlog data')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      // Check if it's a not found error
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }

      // Check if it's a duplicate error
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }

      // Check if it's a permission/access error
      if (error.message.includes('access denied') || 
          error.message.includes('unauthorized')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }

      // Generic error response
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Unknown error
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }

  /**
   * Create standardized success response
   */
  static successResponse<T>(data: T, status: number = 200): NextResponse {
    return NextResponse.json(data, { status });
  }

  /**
   * Create standardized error response
   */
  static errorResponse(message: string, status: number = 400, details?: any): NextResponse {
    const response: any = { error: message };
    if (details) {
      response.details = details;
    }
    return NextResponse.json(response, { status });
  }
}
