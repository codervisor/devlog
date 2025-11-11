/**
 * Chat Session model - represents a complete conversation session
 * Hierarchy: Application → Workspace → Chat Session → Chat Turn → Chat Message
 */

import type { ChatTurn } from './chat-turn.js';

// Session-level metadata based on actual Copilot data structure
export interface ChatSessionMetadata {
  /** Version of the chat session format */
  version: number;
  /** Username of the person making requests */
  requesterUsername: string;
  /** Avatar info for the requester */
  requesterAvatarIconUri?: {
    $mid?: number;
    path?: string;
    scheme?: string;
    authority?: string;
    query?: string;
  };
  /** Username of the AI assistant responding */
  responderUsername: string;
  /** Avatar info for the responder */
  responderAvatarIconUri?: {
    id?: string;
  };
  /** Where the session was initiated (panel, editor, etc.) */
  initialLocation?: string;
  /** Session creation and last activity dates */
  creationDate?: string;
  lastMessageDate?: string;
  /** Whether this session was imported from external source */
  isImported?: boolean;
  /** Custom title for the session */
  customTitle?: string;
  /** Type of session */
  type?: 'chat_session' | 'chat_editing_session' | string;
  /** Source file if imported */
  source_file?: string;
  /** Total number of requests/turns in the session */
  total_requests?: number;
  [key: string]: unknown; // Allow additional properties
}

// Chat Session represents a complete conversation
export interface ChatSession {
  /** Unique identifier for the session */
  id: string;
  /** Workspace identifier this session belongs to */
  workspaceId?: string;
  /** Custom title for the session */
  title?: string;
  /** Session-level metadata */
  metadata: ChatSessionMetadata;
  /** When this session was created */
  createdAt: Date;
  /** When this session was last updated */
  updatedAt: Date;
  /** Chat turns */
  turns: ChatTurn[];
}
