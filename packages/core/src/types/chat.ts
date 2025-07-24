/**
 * Chat history types and interfaces for devlog integration
 *
 * These types support importing and managing AI chat histories from various sources
 * (GitHub Copilot, Cursor, Claude Code, etc.) and linking them to devlog entries.
 */

import type { DevlogId } from './core.js';

/**
 * ID type for chat sessions - using string to handle various formats
 */
export type ChatSessionId = string;

/**
 * ID type for chat messages - using string to handle various formats
 */
export type ChatMessageId = string;

/**
 * Chat message role types
 */
export type ChatRole = 'user' | 'assistant' | 'system';

/**
 * Chat session status for tracking import and processing state
 */
export type ChatStatus = 'imported' | 'linked' | 'archived' | 'processed';

/**
 * AI agent types supported by the system
 */
export type AgentType = 'GitHub Copilot' | 'Cursor' | 'Windsurf' | 'Claude' | 'ChatGPT' | 'Other';

/**
 * Individual chat message within a conversation
 */
export interface ChatMessage {
  /** Unique identifier for the message */
  id: ChatMessageId;

  /** Session this message belongs to */
  sessionId: ChatSessionId;

  /** Role of the message sender */
  role: ChatRole;

  /** Content of the message */
  content: string;

  /** When the message was created */
  timestamp: string; // ISO string

  /** Sequential order within the session */
  sequence: number;

  /** Additional metadata from the original source */
  metadata: Record<string, any>;

  /** Search-optimized content for full-text search */
  searchContent?: string;
}

/**
 * Chat session representing a conversation thread
 */
export interface ChatSession {
  /** Unique identifier for the session */
  id: ChatSessionId;

  /** AI agent that participated in this session */
  agent: AgentType;

  /** When the session was created */
  timestamp: string; // ISO string

  /** Workspace or project this session is associated with */
  workspace?: string;

  /** Workspace path for more precise identification */
  workspacePath?: string;

  /** Title or summary of the conversation */
  title?: string;

  /** Current status of this session */
  status: ChatStatus;

  /** Number of messages in this session */
  messageCount: number;

  /** Duration of the session in milliseconds */
  duration?: number;

  /** Session metadata from the original source */
  metadata: Record<string, any>;

  /** Manual tags for categorization */
  tags: string[];

  /** When this session was imported into devlog */
  importedAt: string; // ISO string

  /** Last time this session was updated */
  updatedAt: string; // ISO string

  /** Devlog entries this session is linked to */
  linkedDevlogs: DevlogId[];

  /** Whether this session has been archived */
  archived: boolean;
}

/**
 * Workspace information extracted from chat sources
 */
export interface ChatWorkspace {
  /** Workspace identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** File system path */
  path?: string;

  /** Source where this workspace was discovered */
  source: string; // e.g., "VS Code", "cursor", etc.

  /** When this workspace was first seen */
  firstSeen: string; // ISO string

  /** When this workspace was last active */
  lastSeen: string; // ISO string

  /** Number of chat sessions in this workspace */
  sessionCount: number;

  /** Associated devlog workspace if mapped */
  devlogWorkspace?: string;

  /** Additional metadata */
  metadata: Record<string, any>;
}

/**
 * Statistics about chat sessions
 */
export interface ChatStats {
  /** Total number of sessions */
  totalSessions: number;

  /** Total number of messages across all sessions */
  totalMessages: number;

  /** Breakdown by agent type */
  byAgent: Record<AgentType, number>;

  /** Breakdown by status */
  byStatus: Record<ChatStatus, number>;

  /** Breakdown by workspace */
  byWorkspace: Record<
    string,
    {
      sessions: number;
      messages: number;
      firstSeen: string;
      lastSeen: string;
    }
  >;

  /** Date range of chat data */
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };

  /** Linked vs unlinked sessions */
  linkageStats: {
    linked: number;
    unlinked: number;
    multiLinked: number; // Sessions linked to multiple devlogs
  };
}

/**
 * Filter criteria for chat queries
 */
export interface ChatFilter {
  /** Filter by agent type */
  agent?: AgentType[];

  /** Filter by status */
  status?: ChatStatus[];

  /** Filter by workspace */
  workspace?: string[];

  /** Filter by linked devlog */
  linkedDevlog?: DevlogId;

  /** Filter by date range */
  fromDate?: string;
  toDate?: string;

  /** Filter by tags */
  tags?: string[];

  /** Include archived sessions */
  includeArchived?: boolean;

  /** Minimum message count */
  minMessages?: number;

  /** Maximum message count */
  maxMessages?: number;
}

/**
 * Search result for chat content searches
 */
export interface ChatSearchResult {
  /** Session information */
  session: ChatSession;

  /** Matching messages */
  messages: Array<{
    message: ChatMessage;
    matchPositions: number[];
    context: string;
    score: number;
  }>;

  /** Overall relevance score */
  relevance: number;

  /** Search context information */
  searchContext: {
    query: string;
    matchType: 'exact' | 'fuzzy' | 'semantic';
    totalMatches: number;
  };
}

/**
 * Linking suggestion between chat sessions and devlog entries
 */
export interface ChatDevlogLink {
  /** Chat session ID */
  sessionId: ChatSessionId;

  /** Devlog entry ID */
  devlogId: DevlogId;

  /** Confidence score for this link (0-1) */
  confidence: number;

  /** Reason for the suggested link */
  reason: 'temporal' | 'content' | 'workspace' | 'manual';

  /** Supporting evidence for the link */
  evidence: {
    timeOverlap?: {
      chatStart: string;
      chatEnd: string;
      devlogStart: string;
      devlogEnd: string;
      overlapHours: number;
    };
    contentMatches?: Array<{
      chatMessageId: string;
      devlogField: string;
      matchText: string;
      score: number;
    }>;
    workspaceMatch?: {
      chatWorkspace: string;
      devlogWorkspace: string;
      similarity: number;
    };
  };

  /** Whether this link has been confirmed by user */
  confirmed: boolean;

  /** When this link was created */
  createdAt: string; // ISO string

  /** Who/what created this link */
  createdBy: 'system' | 'user' | string;
}

/**
 * Import progress tracking
 */
export interface ChatImportProgress {
  /** Unique identifier for this import operation */
  importId: string;

  /** Current status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

  /** Source being imported from */
  source: ChatSource;

  /** Progress information */
  progress: {
    totalSessions: number;
    processedSessions: number;
    totalMessages: number;
    processedMessages: number;
    percentage: number;
  };

  /** Results summary */
  results?: {
    importedSessions: number;
    importedMessages: number;
    linkedSessions: number;
    errors: number;
    warnings: string[];
  };

  /** Start time */
  startedAt: string; // ISO string

  /** Completion time */
  completedAt?: string; // ISO string

  /** Error information if failed */
  error?: {
    message: string;
    details: Record<string, any>;
  };
}

/**
 * Chat import source types
 */
export type ChatSource = 'github-copilot' | 'cursor' | 'claude-code' | 'windsurf' | 'manual';

/**
 * Configuration for importing chat history from various sources
 */
export interface ChatImportConfig {
  /** Source type */
  source: ChatSource;

  /** Source-specific configuration */
  sourceConfig: Record<string, any>;

  /** Whether to auto-link to devlog entries */
  autoLink: boolean;

  /** Confidence threshold for auto-linking */
  autoLinkThreshold: number; // 0-1

  /** Whether to import archived sessions */
  includeArchived: boolean;

  /** Date range for import */
  dateRange?: {
    from: string;
    to: string;
  };

  /** Workspace filters */
  workspaceFilter?: string[];

  /** Whether to overwrite existing sessions */
  overwriteExisting: boolean;
}
