/**
 * Abstract base class for AI assistant chat history parsers
 * 
 * Provides a common interface for parsing chat history from various AI coding assistants
 * like GitHub Copilot, Cursor, Claude Code, etc.
 */

import { ChatSession, WorkspaceData, SearchResult, ChatStatistics } from '../../models/index.js';

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
export abstract class AIAssistantParser {
  protected logger: Logger;
  
  constructor(logger?: Logger) {
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
  abstract discoverChatData(): Promise<WorkspaceData>;

  /**
   * Search for content in chat sessions
   */
  searchChatContent(
    workspaceData: WorkspaceData, 
    query: string, 
    caseSensitive: boolean = false
  ): SearchResult[] {
    const results: SearchResult[] = [];
    const searchQuery = caseSensitive ? query : query.toLowerCase();

    for (const session of workspaceData.chat_sessions) {
      for (const message of session.messages) {
        const content = caseSensitive ? message.content : message.content.toLowerCase();

        if (content.includes(searchQuery)) {
          // Find context around the match
          const matchPos = content.indexOf(searchQuery);
          const contextStart = Math.max(0, matchPos - 100);
          const contextEnd = Math.min(content.length, matchPos + searchQuery.length + 100);
          const context = content.slice(contextStart, contextEnd);

          results.push({
            session_id: session.session_id,
            message_id: message.id,
            role: message.role,
            timestamp: message.timestamp.toISOString(),
            match_position: matchPos,
            context,
            full_content: message.content,
            metadata: message.metadata
          });
        }
      }
    }

    return results;
  }

  /**
   * Get statistics about chat sessions
   */
  getChatStatistics(workspaceData: WorkspaceData): ChatStatistics {
    const stats: ChatStatistics = {
      total_sessions: workspaceData.chat_sessions.length,
      total_messages: 0,
      message_types: {},
      session_types: {},
      workspace_activity: {},
      date_range: {
        earliest: null,
        latest: null
      },
      agent_activity: {}
    };

    const allTimestamps: Date[] = [];

    for (const session of workspaceData.chat_sessions) {
      const sessionType = session.metadata.type || 'unknown';
      stats.session_types[sessionType] = (stats.session_types[sessionType] || 0) + 1;

      allTimestamps.push(session.timestamp);

      const agent = session.agent;
      stats.agent_activity[agent] = (stats.agent_activity[agent] || 0) + 1;

      // Track workspace activity
      const workspace = session.workspace || 'unknown_workspace';
      if (!stats.workspace_activity[workspace]) {
        stats.workspace_activity[workspace] = {
          sessions: 0,
          messages: 0,
          first_seen: session.timestamp.toISOString(),
          last_seen: session.timestamp.toISOString()
        };
      }

      const workspaceStats = stats.workspace_activity[workspace];
      workspaceStats.sessions += 1;

      // Update workspace date range
      if (session.timestamp.toISOString() < workspaceStats.first_seen) {
        workspaceStats.first_seen = session.timestamp.toISOString();
      }
      if (session.timestamp.toISOString() > workspaceStats.last_seen) {
        workspaceStats.last_seen = session.timestamp.toISOString();
      }

      for (const message of session.messages) {
        stats.total_messages += 1;
        workspaceStats.messages += 1;

        const messageType = message.metadata.type || message.role;
        stats.message_types[messageType] = (stats.message_types[messageType] || 0) + 1;

        allTimestamps.push(message.timestamp);
      }
    }

    if (allTimestamps.length > 0) {
      const earliest = new Date(Math.min(...allTimestamps.map(d => d.getTime())));
      const latest = new Date(Math.max(...allTimestamps.map(d => d.getTime())));
      stats.date_range.earliest = earliest.toISOString();
      stats.date_range.latest = latest.toISOString();
    }

    return stats;
  }
}
