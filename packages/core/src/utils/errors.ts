/**
 * Standardized error handling for the devlog system
 * Provides consistent error types and handling patterns
 */

/**
 * Base error class for all devlog-related errors
 */
export class DevlogError extends Error {
  public readonly timestamp: string;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    this.context = context;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize error for logging
   */
  public toLogObject(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Configuration-related errors
 */
export class DevlogConfigurationError extends DevlogError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(`Configuration Error: ${message}`, context);
  }
}

/**
 * Storage-related errors
 */
export class DevlogStorageError extends DevlogError {
  public readonly operation: string;

  constructor(operation: string, message: string, context?: Record<string, unknown>) {
    super(`Storage Error (${operation}): ${message}`, context);
    this.operation = operation;
  }
}

/**
 * Validation errors for input data
 */
export class DevlogValidationError extends DevlogError {
  public readonly field?: string;

  constructor(message: string, field?: string, context?: Record<string, unknown>) {
    super(`Validation Error: ${message}`, context);
    this.field = field;
  }
}

/**
 * Errors related to devlog entries not being found
 */
export class DevlogNotFoundError extends DevlogError {
  public readonly id: string | number;

  constructor(id: string | number, context?: Record<string, unknown>) {
    super(`Devlog entry '${id}' not found`, context);
    this.id = id;
  }
}

/**
 * API-related errors (GitHub, Jira, etc.)
 */
export class DevlogAPIError extends DevlogError {
  public readonly service: string;
  public readonly statusCode?: number;
  public readonly responseBody?: unknown;

  constructor(
    service: string, 
    message: string, 
    statusCode?: number, 
    responseBody?: unknown,
    context?: Record<string, unknown>
  ) {
    super(`API Error (${service}): ${message}`, context);
    this.service = service;
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

/**
 * Network/connectivity errors
 */
export class DevlogNetworkError extends DevlogError {
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error, context?: Record<string, unknown>) {
    super(`Network Error: ${message}`, context);
    this.originalError = originalError;
  }
}

/**
 * Simple logger interface for standardized error logging
 */
export interface Logger {
  error(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}

/**
 * Default console logger implementation
 */
export class ConsoleLogger implements Logger {
  error(message: string, context?: Record<string, unknown>): void {
    console.error(`[ERROR] ${message}`, context ? JSON.stringify(context, null, 2) : '');
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}`, context ? JSON.stringify(context, null, 2) : '');
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.log(`[INFO] ${message}`, context ? JSON.stringify(context, null, 2) : '');
  }

  debug(message: string, context?: Record<string, unknown>): void {
    console.debug(`[DEBUG] ${message}`, context ? JSON.stringify(context, null, 2) : '');
  }
}

/**
 * Global logger instance
 */
export const logger: Logger = new ConsoleLogger();

/**
 * Helper function to handle async operations with proper error logging
 */
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const errorContext = {
      operation: operationName,
      ...context,
      originalError: error instanceof Error ? error.message : String(error),
    };

    if (error instanceof DevlogError) {
      logger.error(`${operationName} failed`, { ...errorContext, ...error.toLogObject() });
      throw error;
    } else {
      logger.error(`${operationName} failed with unexpected error`, errorContext);
      throw new DevlogError(`${operationName} failed: ${error instanceof Error ? error.message : String(error)}`, errorContext);
    }
  }
}

/**
 * Helper function to wrap operations that might throw and convert to DevlogError
 */
export function wrapError<T>(
  operation: () => T,
  errorMessage: string,
  context?: Record<string, unknown>
): T {
  try {
    return operation();
  } catch (error) {
    throw new DevlogError(
      `${errorMessage}: ${error instanceof Error ? error.message : String(error)}`,
      { ...context, originalError: error }
    );
  }
}
