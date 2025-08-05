/**
 * ChatMessage model for AI Chat processing
 */

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
