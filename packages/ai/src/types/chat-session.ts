/**
 * ChatSession model for AI Chat processing
 */

export interface ChatSessionMetadata {
  version?: string;
  requesterUsername?: string;
  responderUsername?: string;
  initialLocation?: Record<string, unknown>;
  creationDate?: string;
  lastMessageDate?: string;
  isImported?: boolean;
  customTitle?: string;
  type?: 'chat_session' | 'chat_editing_session' | string; // Allow any string for flexibility
  source_file?: string;
  total_requests?: number;
  [key: string]: unknown; // Allow additional properties
}

// TypeScript interface
export interface ChatSession {
  /** Unique session identifier */
  id?: string;
  /** Workspace identifier */
  workspaceId?: string;
  /** Custom title for the session */
  title?: string;
  /** Timestamp when the session was created */
  timestamp: Date;
  /** Additional metadata */
  metadata: ChatSessionMetadata;
}
