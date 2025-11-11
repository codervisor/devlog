/**
 * ChatTurn model for grouping related messages in AI Chat processing
 * Hierarchy: Application → Workspace → Chat Session → Chat Turn → Chat Message
 *
 * A ChatTurn represents one complete request-response cycle:
 * - User makes a request (user message)
 * - Assistant responds with multiple actions (assistant messages)
 */

import type { ChatMessage } from './chat-message.js';

// Turn-level metadata based on actual Copilot data structure
export interface ChatTurnMetadata {
  /** Type of turn */
  turnType: 'request_response_cycle';
  /** Current status of the turn */
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  /** When the turn started */
  startedAt: Date;
  /** When the turn completed (if applicable) */
  completedAt?: Date;
  /** Information about the agent handling this turn */
  agentInfo?: {
    name?: string;
    id?: string;
    extensionId?: string;
    description?: string;
    fullName?: string;
    isDefault?: boolean;
    locations?: string[];
    modes?: string[];
  };
  /** Model used for this entire turn */
  modelId?: string;
  /** Whether the turn was cancelled */
  isCanceled?: boolean;
  /** Request/Response IDs from Copilot */
  requestId?: string;
  responseId?: string;
  /** User's original request message */
  userRequest?: {
    text: string;
    parts?: Array<{
      range?: { start: number; endExclusive: number };
      text: string;
      kind: string;
      [key: string]: unknown;
    }>;
  };
  /** Variable data attached to the request */
  variableData?: {
    variables?: Array<{
      id: string;
      name: string;
      value: unknown;
      kind: string;
      [key: string]: unknown;
    }>;
  };
  /** Follow-up suggestions */
  followups?: unknown[];
  /** Content references used in the turn */
  contentReferences?: unknown[];
  /** Code citations */
  codeCitations?: unknown[];
  /** Timing information */
  timings?: {
    firstProgress?: number;
    totalElapsed?: number;
  };
  /** High-level goal or purpose of this turn */
  goal?: string;
  /** Total number of messages in this turn */
  messageCount?: number;
  /** Any turn-level errors or issues */
  errors?: Array<{
    code: string;
    message: string;
    timestamp: Date;
  }>;
  [key: string]: unknown; // Allow additional properties
}

// ChatTurn represents a complete request-response cycle
export interface ChatTurn {
  /** Unique identifier for the turn */
  id: string;
  /** Reference to the parent chat session */
  sessionId: string;
  /** Turn-level metadata */
  metadata: ChatTurnMetadata;
  /** When this turn was created */
  createdAt: Date;
  /** When this turn was last updated */
  updatedAt: Date;
  /** Chat messages */
  messages: ChatMessage[];
}
