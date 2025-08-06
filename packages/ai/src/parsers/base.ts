/**
 * Abstract base class for AI assistant chat history parsers
 *
 * Provides a common interface for parsing chat history from various AI coding assistants
 * like GitHub Copilot, Cursor, Claude Code, etc.
 *
 * Supports four-level hierarchy: Application → Workspace → Session → Turn → Message
 */

import type { ChatSession, ChatTurn, ChatMessage, Application, Workspace, ParserType } from '../types/index.js';

/**
 * Abstract base class for AI assistant parsers
 */
export abstract class BaseParser {
  protected constructor() {
    // Base parser constructor
  }

  /**
   * Get the parser type (e.g. 'github-copilot', 'cursor', etc.)
   * Used for metadata and identification
   */
  abstract getParserType(): ParserType;

  /**
   * Get all available applications (VS Code installations) for this AI assistant
   * Returns lightweight application info without workspaces or sessions
   */
  abstract getApplications(): Promise<Application[]>;

  /**
   * Get all workspaces from a specific application
   * Returns lightweight workspace info without sessions
   */
  abstract getWorkspaces(applicationId: string): Promise<Workspace[]>;

  /**
   * Get all chat sessions from a specific workspace within an application
   */
  abstract getChatSessions(applicationId: string, workspaceId: string): Promise<ChatSession[]>;

  /**
   * Parse a single chat session by session ID
   */
  protected abstract parseChatSession(
    applicationId: string,
    workspaceId: string,
    sessionId: string,
  ): Promise<ChatSession | null>;
}
