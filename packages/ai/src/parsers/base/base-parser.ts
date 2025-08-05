/**
 * Abstract base class for AI assistant chat history parsers
 *
 * Provides a common interface for parsing chat history from various AI coding assistants
 * like GitHub Copilot, Cursor, Claude Code, etc.
 */

import type { ChatSession, Workspace } from '../../models/index.js';

// Logger interface for parsers
export interface Logger {
  error?(message: string, ...args: unknown[]): void;

  warn?(message: string, ...args: unknown[]): void;

  info?(message: string, ...args: unknown[]): void;

  debug?(message: string, ...args: unknown[]): void;
}

// Simple console logger implementation
export class SimpleConsoleLogger implements Logger {
  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    console.log(`[INFO] ${message}`, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    // Only log debug in development or when DEBUG env var is set
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
}

/**
 * Abstract base class for AI assistant parsers
 */
export abstract class BaseParser {
  protected logger: Logger;

  protected constructor(logger?: Logger) {
    this.logger = logger || new SimpleConsoleLogger();
  }

  /**
   * Get the name of the AI assistant this parser handles
   */
  abstract getAssistantName(): string;

  /**
   * Get platform-specific data storage paths for this AI assistant
   */
  protected abstract getDataPaths(): string[];

  /**
   * Parse a single chat session file
   */
  protected abstract parseChatSession(filePath: string): Promise<ChatSession | null>;

  /**
   * Discover and parse all chat data from the assistant's storage
   */
  abstract discoverChatData(): Promise<Workspace>;
}
