/**
 * Abstract base class for AI assistant chat history parsers
 *
 * Provides a common interface for parsing chat history from various AI coding assistants
 * like GitHub Copilot, Cursor, Claude Code, etc.
 * 
 * Supports three-level hierarchy: Application -> Workspace -> Session
 */

import type { ChatSession, ApplicationInfo, WorkspaceInfo } from '../models/index.js';
import { Logger, ConsoleLogger } from './utils.js';

/**
 * Abstract base class for AI assistant parsers
 */
export abstract class BaseParser {
  protected logger: Logger;

  protected constructor(logger?: Logger) {
    this.logger = logger || new ConsoleLogger();
  }

  /**
   * Get all available applications (VS Code installations) for this AI assistant
   * Returns lightweight application info without workspaces or sessions
   */
  abstract getApplications(): Promise<ApplicationInfo[]>;

  /**
   * Get all workspaces from a specific application
   * Returns lightweight workspace info without sessions
   */
  abstract getWorkspaces(applicationId: string): Promise<WorkspaceInfo[]>;

  /**
   * Get all chat sessions from a specific workspace within an application
   */
  abstract getChatSessions(applicationId: string, workspaceId: string): Promise<ChatSession[]>;

  /**
   * Parse a single chat session by session ID
   */
  protected abstract parseChatSession(applicationId: string, workspaceId: string, sessionId: string): Promise<ChatSession | null>;
}
