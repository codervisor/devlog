/**
 * ChatMessage model for AI Chat processing
 */

import { z } from 'zod';

// Specific metadata type definitions
export interface ChatMessageMetadata {
  type?:
    | 'user_request'
    | 'assistant_response'
    | 'editing_session'
    | 'snapshot'
    | 'tool_preparation'
    | 'tool_invocation'
    | 'text_edit'
    | 'code_edit'
    | 'undo_stop'
    | 'inline_reference'
    | 'text_response'
    | 'unknown_response';
  agent?: Record<string, unknown>;
  variableData?: Record<string, unknown>;
  modelId?: string;
  // Tool invocation specific fields
  toolName?: string;
  toolId?: string;
  toolCallId?: string;
  isConfirmed?: boolean;
  isComplete?: boolean;
  resultDetails?: unknown;
  toolSpecificData?: unknown;
  // File/text editing specific fields
  uri?: unknown;
  edits?: unknown[];
  done?: boolean;
  isEdit?: boolean;
  undoId?: string;
  inlineReference?: unknown;
  // Text response specific fields
  supportThemeIcons?: boolean;
  supportHtml?: boolean;
  baseUri?: unknown;
  uris?: unknown;
  kind?: string;
  rawData?: unknown;
  [key: string]: unknown; // Allow additional properties
}

// Zod schema for runtime validation
export const ChatMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.unknown()).default({}),
});

// TypeScript interface
export interface ChatMessage {
  /** Unique identifier for the message */
  id?: string;
  /** Role of the message sender */
  role: 'user' | 'assistant';
  /** Content of the message */
  content: string;
  /** Timestamp when the message was created */
  timestamp: Date;
  /** Additional metadata */
  metadata: ChatMessageMetadata;
}

// Utility class for data manipulation
export class ChatMessageData implements ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata: ChatMessageMetadata;

  constructor(data: Partial<ChatMessage> & Pick<ChatMessage, 'role' | 'content'>) {
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
      metadata: this.metadata,
    };
  }

  static fromDict(data: Record<string, unknown>): ChatMessageData {
    const validated = ChatMessageSchema.parse(data);
    return new ChatMessageData({
      id: validated.id,
      role: validated.role,
      content: validated.content,
      timestamp: new Date(validated.timestamp),
      metadata: validated.metadata as ChatMessageMetadata,
    });
  }
}
