/**
 * ChatSession model for AI Chat processing
 */

import { ChatMessage } from './chat-message.js';

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
  /** Name of the AI agent (e.g., "copilot", "cursor", "windsurf") */
  agent: string;
  /** Timestamp when the session was created */
  timestamp: Date;
  /** List of messages in the session */
  messages: ChatMessage[];
  /** Workspace identifier or path */
  workspace?: string;
  /** Unique session identifier */
  session_id?: string;
  /** Additional metadata */
  metadata: ChatSessionMetadata;
}

// Utility class for data manipulation
export class ChatSessionData implements ChatSession {
  agent: string;
  timestamp: Date;
  messages: ChatMessage[];
  workspace?: string;
  session_id?: string;
  metadata: ChatSessionMetadata;

  constructor(data: Partial<ChatSession> & Pick<ChatSession, 'agent'>) {
    this.agent = data.agent;
    this.timestamp = data.timestamp || new Date();
    this.messages = data.messages || [];
    this.workspace = data.workspace;
    this.session_id = data.session_id;
    this.metadata = data.metadata || {};
  }
}
