/**
 * Structured logging utility
 * 
 * Provides a consistent logging interface across the application.
 * In production, integrates with proper logging services.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: any;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

/**
 * Format log message with context
 */
function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Create a console logger
 * 
 * This is a simple implementation using console methods.
 * In production, this should be replaced with a proper logging service.
 */
export function createConsoleLogger(): Logger {
  return {
    debug(message: string, context?: LogContext): void {
      if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
        console.debug(formatMessage('debug', message, context));
      }
    },

    info(message: string, context?: LogContext): void {
      console.info(formatMessage('info', message, context));
    },

    warn(message: string, context?: LogContext): void {
      console.warn(formatMessage('warn', message, context));
    },

    error(message: string, context?: LogContext): void {
      console.error(formatMessage('error', message, context));
    },
  };
}

/**
 * Default logger instance
 */
export const logger = createConsoleLogger();
