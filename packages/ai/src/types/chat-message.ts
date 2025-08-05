/**
 * ChatMessage model for AI Chat processing
 */

// Specific metadata type definitions
export interface ChatMessageMetadata {
  /** Type of individual message/action within a turn */
  type?:
    | 'user_message' // User input or request
    | 'assistant_message' // Assistant text response
    | 'tool_preparation' // Preparing to use a tool ("prepareToolInvocation")
    | 'tool_invocation' // Actually invoking a tool ("toolInvocationSerialized")
    | 'tool_result' // Result from tool execution
    | 'text_edit' // Individual text edit action ("textEditGroup")
    | 'code_edit' // Individual code edit action
    | 'inline_reference' // Reference to inline content ("inlineReference")
    | 'undo_stop' // Undo operation
    | 'text_response' // Plain text response
    | 'system_message' // System-generated message
    | 'unknown_response'; // Unknown response type

  // Common message fields from Copilot data
  value?: string; // Text content of the message
  supportThemeIcons?: boolean; // Whether message supports theme icons
  supportHtml?: boolean; // Whether message supports HTML
  baseUri?: unknown; // Base URI for resolving relative paths
  uris?: unknown; // URIs referenced in the message
  kind?: string; // Kind of message (e.g., "prepareToolInvocation", "toolInvocationSerialized", "textEditGroup", "inlineReference")
  isTrusted?: boolean; // Whether the message is trusted

  // Tool invocation specific fields
  toolName?: string; // Name of the tool being invoked
  toolId?: string; // Unique identifier for the tool
  toolCallId?: string; // Unique identifier for this specific tool call
  isConfirmed?: boolean; // Whether the tool invocation was confirmed
  isComplete?: boolean; // Whether the tool invocation completed
  resultDetails?: unknown; // Detailed results from tool execution
  toolSpecificData?: unknown; // Tool-specific data and parameters
  invocationMessage?: {
    // Message shown during tool invocation
    value: string;
    isTrusted?: boolean;
    supportThemeIcons?: boolean;
    supportHtml?: boolean;
  };
  pastTenseMessage?: {
    // Message shown after tool completion
    value: string;
    isTrusted?: boolean;
    supportThemeIcons?: boolean;
    supportHtml?: boolean;
  };
  originMessage?: {
    // Origin/source of the tool
    value: string;
    isTrusted?: boolean;
    supportThemeIcons?: boolean;
    supportHtml?: boolean;
  };

  // File/text editing specific fields
  uri?: unknown; // URI of the file being edited
  edits?: unknown[]; // Array of edits being applied
  done?: boolean; // Whether the edit is complete
  inlineReference?: unknown; // Inline reference data

  // Legacy/deprecated fields (kept for backward compatibility)
  variableData?: Record<string, unknown>;

  [key: string]: unknown; // Allow additional properties
}

// TypeScript interface
export interface ChatMessage {
  /** Unique identifier for the message */
  id?: string;
  /** Optional reference to the parent ChatTurn */
  turnId?: string;
  /** Role of the message sender */
  role: 'user' | 'assistant' | 'system';
  /** Content of the message - can be text or structured data */
  content: string | unknown;
  /** Timestamp when the message was created */
  timestamp: Date;
  /** Additional metadata */
  metadata: ChatMessageMetadata;
}
