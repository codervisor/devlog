/**
 * Data models for CodeHist
 * 
 * TypeScript interfaces and classes for representing chat histories 
 * focused on core chat functionality.
 */

import { z } from 'zod';

// Specific metadata type definitions
export interface MessageMetadata {
  type?: 'user_request' | 'assistant_response' | 'editing_session' | 'snapshot';
  agent?: Record<string, unknown>;
  variableData?: Record<string, unknown>;
  modelId?: string;
  result?: Record<string, unknown>;
  followups?: unknown[];
  isCanceled?: boolean;
  contentReferences?: unknown[];
  codeCitations?: unknown[];
  requestTimestamp?: string;
  [key: string]: unknown; // Allow additional properties
}

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
  linearHistoryIndex?: number;
  initialFileContents?: unknown[];
  recentSnapshot?: unknown;
  total_requests?: number;
  [key: string]: unknown; // Allow additional properties
}

export interface WorkspaceMetadata {
  discovered_files_count?: number;
  parsing_errors?: string[];
  total_sessions_discovered?: number;
  discovery_timestamp?: string;
  vscode_installations?: string[];
  [key: string]: unknown; // Allow additional properties
}

// Zod schemas for runtime validation with more specific metadata
export const MessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.unknown()).default({})
});

export const ChatSessionSchema = z.object({
  agent: z.string(),
  timestamp: z.string().datetime(),
  messages: z.array(MessageSchema).default([]),
  workspace: z.string().optional(),
  session_id: z.string().optional(),
  metadata: z.record(z.unknown()).default({})
});

export const WorkspaceDataSchema = z.object({
  agent: z.string(),
  version: z.string().optional(),
  workspace_path: z.string().optional(),
  chat_sessions: z.array(ChatSessionSchema).default([]),
  metadata: z.record(z.unknown()).default({})
});

// TypeScript interfaces
export interface Message {
  /** Unique identifier for the message */
  id?: string;
  /** Role of the message sender */
  role: 'user' | 'assistant';
  /** Content of the message */
  content: string;
  /** Timestamp when the message was created */
  timestamp: Date;
  /** Additional metadata */
  metadata: MessageMetadata;
}

export interface ChatSession {
  /** Name of the AI agent (e.g., "copilot", "cursor", "windsurf") */
  agent: string;
  /** Timestamp when the session was created */
  timestamp: Date;
  /** List of messages in the session */
  messages: Message[];
  /** Workspace identifier or path */
  workspace?: string;
  /** Unique session identifier */
  session_id?: string;
  /** Additional metadata */
  metadata: ChatSessionMetadata;
}

export interface WorkspaceData {
  /** Name of the AI agent */
  agent: string;
  /** Version of the agent or data format */
  version?: string;
  /** Path to the workspace */
  workspace_path?: string;
  /** List of chat sessions */
  chat_sessions: ChatSession[];
  /** Additional metadata */
  metadata: WorkspaceMetadata;
}

export interface SearchResult {
  session_id?: string;
  message_id?: string;
  role: string;
  timestamp: string;
  match_position: number;
  context: string;
  full_content: string;
  metadata: Record<string, unknown>;
}

export interface ChatStatistics {
  total_sessions: number;
  total_messages: number;
  message_types: Record<string, number>;
  session_types: Record<string, number>;
  workspace_activity: Record<string, {
    sessions: number;
    messages: number;
    first_seen: string;
    last_seen: string;
  }>;
  date_range: {
    earliest: string | null;
    latest: string | null;
  };
  agent_activity: Record<string, number>;
}

// Utility classes for data manipulation
export class MessageData implements Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata: MessageMetadata;

  constructor(data: Partial<Message> & Pick<Message, 'role' | 'content'>) {
    this.id = data.id;
    this.role = data.role;
    this.content = data.content;
    this.timestamp = data.timestamp || new Date();
    this.metadata = data.metadata || {};
  }

  toDict(): Record<string, unknown> {
    return {
      id: this.id,
      role: this.role,
      content: this.content,
      timestamp: this.timestamp.toISOString(),
      metadata: this.metadata
    };
  }

  static fromDict(data: Record<string, unknown>): MessageData {
    const validated = MessageSchema.parse(data);
    return new MessageData({
      id: validated.id,
      role: validated.role,
      content: validated.content,
      timestamp: new Date(validated.timestamp),
      metadata: validated.metadata as MessageMetadata
    });
  }
}

export class ChatSessionData implements ChatSession {
  agent: string;
  timestamp: Date;
  messages: Message[];
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

  toDict(): Record<string, unknown> {
    return {
      agent: this.agent,
      timestamp: this.timestamp.toISOString(),
      messages: this.messages.map(msg => 
        msg instanceof MessageData ? msg.toDict() : new MessageData(msg).toDict()
      ),
      workspace: this.workspace,
      session_id: this.session_id,
      metadata: this.metadata
    };
  }

  static fromDict(data: Record<string, unknown>): ChatSessionData {
    const validated = ChatSessionSchema.parse(data);
    return new ChatSessionData({
      agent: validated.agent,
      timestamp: new Date(validated.timestamp),
      messages: validated.messages.map((msgData: unknown) => MessageData.fromDict(msgData as Record<string, unknown>)),
      workspace: validated.workspace,
      session_id: validated.session_id,
      metadata: validated.metadata as ChatSessionMetadata
    });
  }
}

export class WorkspaceDataContainer implements WorkspaceData {
  agent: string;
  version?: string;
  workspace_path?: string;
  chat_sessions: ChatSession[];
  metadata: WorkspaceMetadata;

  constructor(data: Partial<WorkspaceData> & Pick<WorkspaceData, 'agent'>) {
    this.agent = data.agent;
    this.version = data.version;
    this.workspace_path = data.workspace_path;
    this.chat_sessions = data.chat_sessions || [];
    this.metadata = data.metadata || {};
  }

  toDict(): Record<string, unknown> {
    return {
      agent: this.agent,
      version: this.version,
      workspace_path: this.workspace_path,
      chat_sessions: this.chat_sessions.map(session => 
        session instanceof ChatSessionData ? session.toDict() : new ChatSessionData(session).toDict()
      ),
      metadata: this.metadata
    };
  }

  static fromDict(data: Record<string, unknown>): WorkspaceDataContainer {
    const validated = WorkspaceDataSchema.parse(data);
    return new WorkspaceDataContainer({
      agent: validated.agent,
      version: validated.version,
      workspace_path: validated.workspace_path,
      chat_sessions: validated.chat_sessions.map((sessionData: unknown) => ChatSessionData.fromDict(sessionData as Record<string, unknown>)),
      metadata: validated.metadata as WorkspaceMetadata
    });
  }
}
