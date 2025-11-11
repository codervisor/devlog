/**
 * Centralized MCP Server Manager
 * Provides singleton access to server instance and unified logging
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { LoggingLevel } from '@modelcontextprotocol/sdk/types.js';

/**
 * Singleton manager for MCP Server instance and logging
 */
export class ServerManager {
  private static instance: ServerManager | null = null;
  private server: Server | null = null;
  private loggingLevel: LoggingLevel = 'info';

  private constructor() {}

  static getInstance(): ServerManager {
    if (!ServerManager.instance) {
      ServerManager.instance = new ServerManager();
    }
    return ServerManager.instance;
  }

  /**
   * Set the MCP Server instance
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Get the MCP Server instance
   */
  getServer(): Server | null {
    return this.server;
  }

  /**
   * Set logging level
   */
  setLoggingLevel(level: LoggingLevel): void {
    this.loggingLevel = level;
  }

  /**
   * Send a logging message to the MCP client
   */
  private sendLog(level: LoggingLevel, message: string, data?: any): void {
    if (this.server) {
      try {
        this.server.sendLoggingMessage({
          level,
          data: data ? `${message} ${JSON.stringify(data)}` : message,
        });
      } catch (error) {
        console.error(`Failed to send log to MCP client: ${error}`);
        console[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log'](message, data);
      }
    } else {
      // Fallback to console if server not available
      console[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log'](message, data);
    }
  }

  /**
   * Log info message
   */
  info(message: string, data?: any): void {
    this.sendLog('info', message, data);
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: any): void {
    if (this.loggingLevel === 'debug') {
      this.sendLog('debug', message, data);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: any): void {
    if (this.loggingLevel !== 'error') {
      this.sendLog('warning', message, data);
    }
  }

  /**
   * Log error message
   */
  error(message: string, data?: any): void {
    this.sendLog('error', message, data);
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.server = null;
  }
}

/**
 * Global logger instance - use this throughout the MCP server
 */
export const logger = ServerManager.getInstance();
