/**
 * Data models for CodeHist
 * 
 * TypeScript interfaces and classes for representing chat histories 
 * focused on core chat functionality.
 */

import { z } from 'zod';

// Zod schemas for runtime validation
export const MessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.any()).default({})
});

export const ChatSessionSchema = z.object({
  agent: z.string(),
  timestamp: z.string().datetime(),
  messages: z.array(MessageSchema).default([]),
  workspace: z.string().optional(),
  session_id: z.string().optional(),
  metadata: z.record(z.any()).default({})
});

export const WorkspaceDataSchema = z.object({
  agent: z.string(),
  version: z.string().optional(),
  workspace_path: z.string().optional(),
  chat_sessions: z.array(ChatSessionSchema).default([]),
  metadata: z.record(z.any()).default({})
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
  metadata: Record<string, any>;
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
  metadata: Record<string, any>;
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
  metadata: Record<string, any>;
}

// Utility classes for data manipulation
export class MessageData implements Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata: Record<string, any>;

  constructor(data: Partial<Message> & Pick<Message, 'role' | 'content'>) {
    this.id = data.id;
    this.role = data.role;
    this.content = data.content;
    this.timestamp = data.timestamp || new Date();
    this.metadata = data.metadata || {};
  }

  toDict(): Record<string, any> {
    return {
      id: this.id,
      role: this.role,
      content: this.content,
      timestamp: this.timestamp.toISOString(),
      metadata: this.metadata
    };
  }

  static fromDict(data: Record<string, any>): MessageData {
    const validated = MessageSchema.parse(data);
    return new MessageData({
      id: validated.id,
      role: validated.role,
      content: validated.content,
      timestamp: new Date(validated.timestamp),
      metadata: validated.metadata
    });
  }
}

export class ChatSessionData implements ChatSession {
  agent: string;
  timestamp: Date;
  messages: Message[];
  workspace?: string;
  session_id?: string;
  metadata: Record<string, any>;

  constructor(data: Partial<ChatSession> & Pick<ChatSession, 'agent'>) {
    this.agent = data.agent;
    this.timestamp = data.timestamp || new Date();
    this.messages = data.messages || [];
    this.workspace = data.workspace;
    this.session_id = data.session_id;
    this.metadata = data.metadata || {};
  }

  toDict(): Record<string, any> {
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

  static fromDict(data: Record<string, any>): ChatSessionData {
    const validated = ChatSessionSchema.parse(data);
    return new ChatSessionData({
      agent: validated.agent,
      timestamp: new Date(validated.timestamp),
      messages: validated.messages.map((msgData: any) => MessageData.fromDict(msgData)),
      workspace: validated.workspace,
      session_id: validated.session_id,
      metadata: validated.metadata
    });
  }
}

export class WorkspaceDataContainer implements WorkspaceData {
  agent: string;
  version?: string;
  workspace_path?: string;
  chat_sessions: ChatSession[];
  metadata: Record<string, any>;

  constructor(data: Partial<WorkspaceData> & Pick<WorkspaceData, 'agent'>) {
    this.agent = data.agent;
    this.version = data.version;
    this.workspace_path = data.workspace_path;
    this.chat_sessions = data.chat_sessions || [];
    this.metadata = data.metadata || {};
  }

  toDict(): Record<string, any> {
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

  static fromDict(data: Record<string, any>): WorkspaceDataContainer {
    const validated = WorkspaceDataSchema.parse(data);
    return new WorkspaceDataContainer({
      agent: validated.agent,
      version: validated.version,
      workspace_path: validated.workspace_path,
      chat_sessions: validated.chat_sessions.map((sessionData: any) => ChatSessionData.fromDict(sessionData)),
      metadata: validated.metadata
    });
  }
}
